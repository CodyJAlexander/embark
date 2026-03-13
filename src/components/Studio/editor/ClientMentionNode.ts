import { Node, mergeAttributes } from '@tiptap/core';

export const ClientMentionNode = Node.create({
  name: 'clientMention',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-client-mention]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-client-mention': node.attrs.id,
        class: 'client-mention-chip',
      }),
      `@${node.attrs.label}`,
    ];
  },
});
