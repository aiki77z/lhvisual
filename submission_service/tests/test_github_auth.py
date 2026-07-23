from __future__ import annotations

from fastapi.testclient import TestClient

from submission_service.app.main import create_app
from submission_service.app.services.github_auth import (
    GitHubOAuthService,
    GitHubUserProfile,
    create_oauth_state,
)
from submission_service.tests.conftest import build_test_config


def test_github_callback_sets_cookie_and_session(tmp_path, monkeypatch) -> None:
    config = build_test_config(tmp_path, process_inline=True)
    app = create_app(config)
    with app.state.session_factory() as session:
        oauth_state = create_oauth_state(session, return_to="https://loopsbench.ai/submit-task")
        state = oauth_state.state
        session.commit()

    def fake_exchange(self, *, code: str):  # noqa: ANN001
        assert code == "oauth-code"
        return GitHubUserProfile(
            github_user_id=42,
            login="oauth-user",
            name="OAuth User",
            email="oauth@example.com",
            avatar_url="https://avatars.example.test/oauth-user.png",
            profile_url="https://github.com/oauth-user",
            access_token="gho_oauth_user_token",
            scope_csv="public_repo,read:user,user:email",
        )

    monkeypatch.setattr(GitHubOAuthService, "exchange_code_for_user", fake_exchange)
    client = TestClient(app)

    response = client.get(f"/api/v1/github/callback?code=oauth-code&state={state}")
    assert response.status_code == 200, response.text
    assert config.github_session_cookie_name in client.cookies

    session_response = client.get("/api/v1/github/session")
    assert session_response.status_code == 200, session_response.text
    payload = session_response.json()
    assert payload["authenticated"] is True
    assert payload["user"]["login"] == "oauth-user"
