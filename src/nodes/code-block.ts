import { common, createLowlight } from "lowlight";
import { CodeBlockLowlight, CodeBlockLowlightOptions } from "@tiptap/extension-code-block-lowlight";
import tippy from "tippy.js";
import { NodeMarkdownStorage } from "../extensions/markdown";
import { BlockMenuItemStorage } from "../extensions/block-menu/menu";
import { code } from "../utils/icons";

export interface CodeBlockOptions extends CodeBlockLowlightOptions {
  dictionary: Record<string, string>;
}

export const CodeBlock = CodeBlockLowlight.extend<CodeBlockOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      lowlight: createLowlight(common),
      dictionary: {
        "name": "CodeBlock",
        "copy": "Copy",
        "copied": "Copied!",
        "arduino": "Arduino",
        "bash": "Bash",
        "c": "C",
        "cpp": "C++",
        "csharp": "C#",
        "css": "CSS",
        "diff": "Diff",
        "go": "Go",
        "graphql": "GraphQL",
        "ini": "INI",
        "java": "Java",
        "javascript": "JavaScript",
        "json": "JSON",
        "kotlin": "Kotlin",
        "less": "Less",
        "lua": "Lua",
        "makefile": "Makefile",
        "markdown": "Markdown",
        "objectivec": "Objective-C",
        "perl": "Perl",
        "php": "PHP",
        "php-template": "PHP Template",
        "plaintext": "Text",
        "python": "Python",
        "python-repl": "Python Repl",
        "r": "R",
        "ruby": "Ruby",
        "rust": "Rust",
        "scss": "Scss",
        "shell": "Shell",
        "sql": "SQL",
        "swift": "Swift",
        "typescript": "TypeScript",
        "vbnet": "Visual Basic .NET",
        "wasm": "WebAssembly",
        "xml": "XML",
        "yaml": "YAML",
      },
    };
  },
  addAttributes() {
    return {
      language: {
        default: "plaintext",
      },
    };
  },
  addStorage() {
    return {
      ...this.parent?.(),
      parser: {
        match: node => node.type === "code",
        apply: (state, node, type) => {
          const language = node.lang as string;
          const value = node.value as string;
          state.openNode(type, { language });
          state.addText(value);
          state.closeNode();
        },
      },
      serializer: {
        match: node => node.type.name === this.name,
        apply: (state, node) => {
          state.addNode({
            type: "code",
            value: node.content.firstChild?.text || "",
            lang: node.attrs.language,
          });
        },
      },
      blockMenu: {
        id: this.name,
        name: this.options.dictionary.name,
        icon: code,
        shortcut: "Mod-Alt-C",
        keywords: "codeblock,cb,dmk,",
        action: editor => editor.chain().toggleCodeBlock().focus().run(),
      },
    } satisfies NodeMarkdownStorage & BlockMenuItemStorage;
  },
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive(this.name)) {
          this.editor.commands.insertContent("  ");
          return true;
        }
        return false;
      },
    };
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const parent = document.createElement("pre");
      const toolbar = document.createElement("div");
      const content = document.createElement("code");

      parent.classList.add("ProseMirror-code-block");
      toolbar.classList.add("ProseMirror-code-block-toolbar");
      content.classList.add("ProseMirror-code-block-content");
      for (const [key, value] of Object.entries(this.options.HTMLAttributes)) {
        parent.setAttribute(key, value);
      }

      // language list
      const language = document.createElement("select");
      for (const name of this.options.lowlight.listLanguages() as string[]) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = this.options.dictionary[name] ?? name;
        language.append(option);
      }
      language.value = node.attrs.language;
      language.addEventListener("change", () => {
        if (!editor.isEditable) {
          language.value = node.attrs.language;
        } else if (typeof getPos === "function") {
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(getPos(), undefined, {
              ...node.attrs,
              language: language.value,
            }),
          );
        }
      });

      // copy button
      const copy = document.createElement("button");
      copy.textContent = this.options.dictionary.copy;
      const copied = document.createElement("span");
      copied.textContent = this.options.dictionary.copied;
      copied.classList.add("ProseMirror-fm-button-popover");
      const instance = tippy(copy, {
        appendTo: () => document.body,
        content: copied,
        arrow: false,
        theme: "ProseMirror-dark",
        animation: "shift-away",
        duration: [200, 150],
        trigger: "manual",
      });
      copy.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(node.content.firstChild?.text || "").then(() => {
          instance.show();
          setTimeout(() => instance.hide(), 1000);
        });
      });

      toolbar.contentEditable = "false";
      toolbar.append(language);
      toolbar.append(copy);
      parent.append(toolbar);
      parent.append(content);
      return {
        dom: parent,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false;
          }
          language.value = updatedNode.attrs.language;
          return true;
        },
      };
    };
  },
});
