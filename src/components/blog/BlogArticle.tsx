import type { BlogPost } from "../../data/posts";
import { BlogHeader } from "./BlogHeader";
import { BlogMetricGrid } from "./BlogMetricGrid";
import { BlogNote } from "./BlogNote";
import { BlogTable } from "./BlogTable";

type BlogArticleProps = {
  post: BlogPost;
};

export function BlogArticle({ post }: BlogArticleProps) {
  return (
    <article className="article-shell">
      <BlogHeader post={post} />

      <BlogMetricGrid metrics={post.metrics} />
      <BlogNote>{post.note}</BlogNote>

      {post.sections.map((section, index) => (
        <section className="article-section" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {index === 2 ? <BlogTable rows={post.resultRows} /> : null}
        </section>
      ))}

      <section className="article-section" aria-labelledby="citation-title">
        <h2 id="citation-title">Reference</h2>
        <pre className="citation-block">{post.citation}</pre>
      </section>
    </article>
  );
}
