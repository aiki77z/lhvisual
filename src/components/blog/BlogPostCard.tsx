import type { BlogPost } from "../../data/posts";

type BlogPostCardProps = {
  post: BlogPost;
};

export function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <article className="post-card">
      <p className="article-date">{post.date}</p>
      <h2>
        <a href={`/blog/${post.slug}`}>{post.title}</a>
      </h2>
      <p>{post.excerpt}</p>
      <span>By {post.authors.join(", ")}</span>
    </article>
  );
}
