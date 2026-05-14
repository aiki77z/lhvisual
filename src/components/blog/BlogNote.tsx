type BlogNoteProps = {
  children: string;
};

export function BlogNote({ children }: BlogNoteProps) {
  return <aside className="article-note">{children}</aside>;
}
