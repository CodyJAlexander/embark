import { Node, mergeAttributes } from '@tiptap/core';

export const ToggleNode = Node.create({
  name: 'toggleBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      open: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggleBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggleBlock' }), 0];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      let currentAttrs = node.attrs;

      const dom = document.createElement('div');
      dom.className = 'toggle-block';
      dom.setAttribute('data-type', 'toggleBlock');

      // Toggle button
      const btn = document.createElement('button');
      btn.contentEditable = 'false';
      btn.className = 'toggle-btn';
      btn.textContent = currentAttrs.open ? '▼' : '▶';
      btn.addEventListener('click', () => {
        if (typeof getPos !== 'function') return;
        const newOpen = !currentAttrs.open;
        editor.commands.command(({ tr, dispatch }) => {
          tr.setNodeMarkup(getPos(), undefined, { ...currentAttrs, open: newOpen });
          if (dispatch) dispatch(tr);
          return true;
        });
      });
      dom.appendChild(btn);

      // Editable content area
      const contentDOM = document.createElement('div');
      contentDOM.className = 'toggle-content';
      if (!currentAttrs.open) contentDOM.style.display = 'none';
      dom.appendChild(contentDOM);

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type.name !== 'toggleBlock') return false;
          currentAttrs = updatedNode.attrs;
          btn.textContent = updatedNode.attrs.open ? '▼' : '▶';
          contentDOM.style.display = updatedNode.attrs.open ? '' : 'none';
          return true;
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
