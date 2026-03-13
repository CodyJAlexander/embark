import { Node, mergeAttributes } from '@tiptap/core';

const EMOJIS = ['💡', '⚠️', '🔥', '📝', '✅', '❌', '💬', '🎯', '📌', 'ℹ️'];

type CalloutColor = 'yellow' | 'red' | 'blue' | 'green';

export const CalloutNode = Node.create({
  name: 'calloutBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      emoji: { default: '💡' },
      color: { default: 'yellow' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="calloutBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'calloutBlock' }), 0];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentAttrs = node.attrs;

      const dom = document.createElement('div');
      dom.className = `callout-block callout-${currentAttrs.color as CalloutColor}`;
      dom.setAttribute('data-type', 'calloutBlock');

      // Emoji button + picker wrapper
      const emojiBtn = document.createElement('button');
      emojiBtn.contentEditable = 'false';
      emojiBtn.className = 'callout-emoji-btn';
      emojiBtn.textContent = currentAttrs.emoji as string;

      let picker: HTMLDivElement | null = null;

      const closePicker = () => {
        if (picker) {
          picker.remove();
          picker = null;
          document.removeEventListener('click', onOutsideClick);
        }
      };

      const onOutsideClick = (e: MouseEvent) => {
        if (picker && !picker.contains(e.target as globalThis.Node) && e.target !== emojiBtn) {
          closePicker();
        }
      };

      emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (picker) {
          closePicker();
          return;
        }

        picker = document.createElement('div');
        picker.className = 'callout-emoji-picker';

        for (const emoji of EMOJIS) {
          const btn = document.createElement('button');
          btn.textContent = emoji;
          btn.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (typeof getPos !== 'function') return;
            editor.commands.command(({ tr, dispatch }) => {
              tr.setNodeMarkup(getPos() as number, undefined, { ...currentAttrs, emoji });
              if (dispatch) dispatch(tr);
              return true;
            });
            closePicker();
          });
          picker.appendChild(btn);
        }

        emojiBtn.appendChild(picker);
        setTimeout(() => {
          document.addEventListener('click', onOutsideClick);
        }, 0);
      });

      dom.appendChild(emojiBtn);

      // Editable content area
      const contentDOM = document.createElement('div');
      contentDOM.className = 'callout-content';
      dom.appendChild(contentDOM);

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type.name !== 'calloutBlock') return false;
          currentAttrs = updatedNode.attrs;
          emojiBtn.textContent = updatedNode.attrs.emoji as string;
          if (picker) emojiBtn.appendChild(picker);
          dom.className = `callout-block callout-${updatedNode.attrs.color as CalloutColor}`;
          return true;
        },
        destroy() {
          closePicker();
        },
      };
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty) return false;
        if ($from.parent.content.size === 0 && $from.depth >= 2) {
          return this.editor.commands.liftEmptyBlock();
        }
        return false;
      },
    };
  },
});
