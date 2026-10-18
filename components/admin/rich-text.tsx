"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Quote, Redo2, Undo2, Pilcrow } from "lucide-react";
import { cn } from "@/lib/utils";

/** Lightweight Tiptap editor (replaces the legacy 28 KB TextEditor + WordLikeEditor). */
export function RichText({
  value,
  onChange,
  dir,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  dir?: "ltr" | "rtl";
  placeholder?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] } })],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose-kompass tiptap px-4 py-3 text-sm",
        dir: dir ?? "auto",
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // keep in sync when the value is reset from outside (discard)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const btn = (active: boolean, onClick: () => void, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn("flex size-8 items-center justify-center rounded-md transition [&_svg]:size-4", active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
    >
      {icon}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-input bg-surface focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15">
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-surface-2/60 px-1.5 py-1" dir="ltr">
        {editor && (
          <>
            {btn(editor.isActive("paragraph"), () => editor.chain().focus().setParagraph().run(), <Pilcrow />, "Paragraph")}
            {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 />, "H2")}
            {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 />, "H3")}
            <span className="mx-1 h-5 w-px bg-border" />
            {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold />, "Bold")}
            {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic />, "Italic")}
            <span className="mx-1 h-5 w-px bg-border" />
            {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List />, "Bullets")}
            {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered />, "Numbered")}
            {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), <Quote />, "Quote")}
            <span className="mx-1 h-5 w-px bg-border" />
            {btn(false, () => editor.chain().focus().undo().run(), <Undo2 />, "Undo")}
            {btn(false, () => editor.chain().focus().redo().run(), <Redo2 />, "Redo")}
          </>
        )}
      </div>
      <EditorContent editor={editor} className="max-h-[420px] min-h-[180px] overflow-y-auto" />
    </div>
  );
}
