import { Extension } from '@tiptap/core';

/**
 * Minimal extension that marks slash-command state.
 * The actual slash menu UI is handled by SlashMenu.tsx via FloatingMenu,
 * which shows when the cursor is in a paragraph containing only '/'.
 */
export const SlashExtension = Extension.create({
  name: 'slashExtension',

  addKeyboardShortcuts() {
    return {
      // Allow Escape to blur the slash menu (FloatingMenu handles visibility)
      Escape: () => false,
    };
  },
});
