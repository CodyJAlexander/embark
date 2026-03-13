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
      const dom = document.createElement('div');
      dom.className = 'toggle-block';
      dom.setAttribute('data-type', 'toggleBlock');

      // Toggle button
      const btn = document.createElement('button');
      btn.contentEditable = 'false';
      btn.className = 'toggle-btn';
      btn.textContent = node.attrs.open ? '▼' : '▶';
      btn.addEventListener('click', () => {
        if (typeof getPos === 'function') {
          const newOpen = !node.attrs.open;
          editor.commands.command(({ tr }) => {
            tr.setNodeMarkup(getPos(), undefined, { ...node.attrs, open: newOpen });
            return true;
          });
        }
      });
      dom.appendChild(btn);

      // Editable content area
      const contentDOM = document.createElement('div');
      contentDOM.className = 'toggle-content';
      if (!node.attrs.open) contentDOM.style.display = 'none';
      dom.appendChild(contentDOM);

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type.name !== 'toggleBlock') return false;
          btn.textContent = updatedNode.attrs.open ? '▼' : '▶';
          contentDOM.style.display = updatedNode.attrs.open ? '' : 'none';
          return true;
        },
      };
    };
  },
});
