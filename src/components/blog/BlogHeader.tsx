import type { BlogPost } from "../../data/posts";

type BlogHeaderProps = {
  post: BlogPost;
};

export function BlogHeader({ post }: BlogHeaderProps) {
  return (
    <header className="blog-header">
      <p className="article-date">{post.date}</p>
      <h1>{post.title}</h1>
      <p className="subtitle">{post.subtitle}</p>
      <p className="author-line">By {post.authors.join(", ")}</p>
    </header>
  );
}
