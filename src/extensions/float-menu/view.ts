import tippy, { Instance, Props } from "tippy.js";
import { EditorView } from "@tiptap/pm/view";
import { EditorState } from "@tiptap/pm/state";
import { Editor, Range, isNodeSelection, posToDOMRect } from "@tiptap/core";

export interface FloatMenuInputViewOptions {
  id?: string;
  name: string;
  type?: string;
  value?: string;
  onEnter?: (value: string, event: KeyboardEvent) => void;
  onChange?: (value: string, event: Event) => void;
}

export interface FloatMenuButtonViewOptions {
  id?: string;
  name: string;
  icon: string | HTMLElement | (() => HTMLElement | string);
  shortcut?: string;
  onClick?: (event: MouseEvent) => void;
}

export interface FloatMenuViewOptions {
  editor: Editor;
  class?: string | string[];
  style?: CSSStyleDeclaration | CSSStyleDeclaration[];
  rect?: (props: { view: FloatMenuView; editor: Editor; range: Range }) => DOMRect;
  show?: (props: { view: FloatMenuView; editor: Editor; range: Range }) => boolean;
  tippy?: (props: { view: FloatMenuView; editor: Editor; range: Range; options: Partial<Props> }) => Partial<Props>;
  onInit?: (props: { view: FloatMenuView; editor: Editor; range: Range; element: HTMLElement; show: () => void; hide: () => void }) => void;
  onUpdate?: (props: { view: FloatMenuView; editor: Editor; range: Range; element: HTMLElement; show: () => void; hide: () => void }) => void;
  onDestroy?: (props: { view: FloatMenuView; editor: Editor; range: Range; element: HTMLElement; show: () => void; hide: () => void }) => void;
}

export class FloatMenuView {
  private readonly editor: Editor;
  private readonly popover: Instance;
  private readonly element: HTMLElement;
  private readonly options: FloatMenuViewOptions;

  constructor(options: FloatMenuViewOptions) {
    this.editor = options.editor;
    this.options = options;
    this.element = this._createElement();
    this.popover = this._createPopover();
  }

  public show() {
    this.popover.show();
  }

  public hide() {
    this.popover.hide();
  }

  public update(view: EditorView, oldState?: EditorState) {
    const state = view.state;

    // skip render
    if (view.composing || (oldState && oldState.doc.eq(state.doc) && oldState.selection.eq(state.selection))) {
      return;
    }

    const props = this._createProps();

    // check should show
    if (!this.options.show?.(props)) {
      this.hide();
      return;
    }

    // on update
    if (this.options.onUpdate) {
      this.options.onUpdate({ ...props, element: this.element });
    }

    // reset client rect
    this.popover.setProps({ getReferenceClientRect: () => this._createRect()(props) });

    // switch to show
    this.show();
  }

  public destroy() {
    if (this.options.onDestroy) {
      const props = this._createProps();
      this.options.onDestroy({ ...props, element: this.element });
    }
    this.popover.destroy();
  }

  public createInput(options: FloatMenuInputViewOptions) {
    const input = document.createElement("input");
    input.classList.add("tiptap-fm-input");
    if (options.id) {
      input.name = options.id;
    }
    if (options.type) {
      input.type = options.type;
    }
    if (options.value) {
      input.value = options.value;
    }
    if (options.name) {
      input.placeholder = options.name;
    }
    if (options.onEnter) {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          options.onEnter?.(input.value, e);
        }
      });
    }
    if (options.onChange) {
      input.addEventListener("change", (e) => {
        options.onChange?.(input.value, e);
      });
    }
    return { input };
  }

  public createButton(options: FloatMenuButtonViewOptions) {
    const button = document.createElement("button");
    button.classList.add("tiptap-fm-button");
    if (options.id) {
      button.name = options.id;
    }
    if (options.icon) {
      const icon = typeof options.icon === "function" ? options.icon() : options.icon;
      if (typeof icon === "string") {
        button.innerHTML = icon;
      } else {
        button.append(icon);
      }
    }

    if (options.onClick) {
      button.addEventListener("click", (e) => {
        options.onClick?.(e);
      });
    }

    const popover = document.createElement("div");
    popover.classList.add("tiptap-fm-button-popover");
    popover.innerHTML = options.name;

    if (options.shortcut) {
      popover.innerHTML += "&nbsp;·&nbsp;";
      options.shortcut.split(" ").forEach((value, index) => {
        if (index !== 0) {
          const span = document.createElement("span");
          span.textContent = "+";
          popover.append(span);
        }
        const kbd = document.createElement("kbd");
        kbd.textContent = value;
        popover.append(kbd);
      });
    }

    const instance = tippy(button, {
      content: popover,
      arrow: false,
      inertia: true,
      theme: "tiptap-dark",
      placement: "top",
      animation: "shift-away",
      duration: [200, 150],
    });

    return { button, popover, instance };
  }

  private _createRect() {
    if (this.options.rect) {
      return this.options.rect;
    }
    return ({ editor, range }: { editor: Editor; range: Range }) => {
      const { view, state } = editor;
      if (isNodeSelection(state.selection)) {
        const node = view.nodeDOM(range.from) as HTMLElement;

        if (node) {
          return node.getBoundingClientRect();
        }
      }
      return posToDOMRect(view, range.from, range.to);
    };
  }

  private _createProps() {
    const ranges = this.editor.view.state.selection.ranges;
    const from = Math.min(...ranges.map(r => r.$from.pos));
    const to = Math.max(...ranges.map(r => r.$to.pos));
    return {
      range: { from, to },
      editor: this.editor,
      view: this,
      show: this.show.bind(this),
      hide: this.hide.bind(this),
    };
  }

  private _createElement() {
    const element = document.createElement("div");
    element.classList.add("tiptap-fm");
    if (this.options.class) {
      for (const item of Array.isArray(this.options.class) ? this.options.class : [this.options.class]) {
        element.classList.add(item);
      }
    }
    if (this.options.style) {
      for (const item of Array.isArray(this.options.style) ? this.options.style : [this.options.style]) {
        for (const [key, val] of Object.entries(item)) {
          // @ts-expect-error
          element.style[key] = val;
        }
      }
    }
    if (this.options.onInit) {
      const props = this._createProps();
      this.options.onInit({ ...props, element });
    }
    return element;
  }

  private _createPopover() {
    const props = this._createProps();
    const options: Partial<Props> = {
      appendTo: () => document.body,
      getReferenceClientRect: null,
      content: this.element,
      interactive: true,
      theme: "tiptap-dark",
      trigger: "manual",
      placement: "top",
    };
    return tippy(document.body, this.options.tippy ? this.options.tippy({ ...props, options }) : options);
  }
}
