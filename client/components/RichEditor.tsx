import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bold, Italic, Strikethrough, List, ListOrdered, Undo2, Redo2, Eraser } from "lucide-react";

export type RichEditorProps = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
  toolbarExtras?: React.ReactNode;
};

export default function RichEditor({ value, onChange, className, placeholder, toolbarExtras }: RichEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-neutral dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-3",
        spellcheck: "true",
        role: "textbox",
        "aria-multiline": "true",
        "data-placeholder": placeholder || "Start writing…",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "", { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  const btn = (active: boolean) => `h-8 px-2 ${active ? "bg-primary text-primary-foreground" : ""}`;

  return (
    <div className={className}>
      <div className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-2 py-1 overflow-x-auto">
          <div className="flex items-center gap-3 shrink-0">{toolbarExtras}</div>
          <TooltipProvider delayDuration={150}>
            <div className="flex items-center gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Bold"
                    title="Bold"
                    className={btn(editor.isActive("bold"))}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Italic"
                    title="Italic"
                    className={btn(editor.isActive("italic"))}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Strikethrough"
                    title="Strikethrough"
                    className={btn(editor.isActive("strike"))}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                  >
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Strikethrough</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Bullet list"
                    title="Bullet list"
                    className={btn(editor.isActive("bulletList"))}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet list</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Ordered list"
                    title="Ordered list"
                    className={btn(editor.isActive("orderedList"))}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ordered list</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Undo"
                    title="Undo"
                    className="h-8 px-2"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Redo"
                    title="Redo"
                    className="h-8 px-2"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="mx-1 h-6" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label="Clear formatting"
                    title="Clear formatting"
                    className="h-8 px-2"
                    onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                  >
                    <Eraser className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear formatting</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
      <div className="rounded-md border-2 border-primary">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
