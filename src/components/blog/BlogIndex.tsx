import { posts } from "../../data/posts";
import { BlogArticle } from "./BlogArticle";
import { BlogPostCard } from "./BlogPostCard";

export function BlogIndex() {
  const [featuredPost, ...otherPosts] = posts;

  return (
    <div className="blog-index">
      <BlogArticle post={featuredPost} />
      <section className="related-posts" aria-labelledby="related-title">
        <div className="article-shell compact">
          <p className="eyebrow">More notes</p>
          <h2 id="related-title">Additional mock posts</h2>
          <div className="post-list">
            {otherPosts.map((post) => (
              <BlogPostCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
