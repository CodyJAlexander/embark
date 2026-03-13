import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import type { MutableRefObject } from 'react';
import type { MentionListRef } from './MentionList';
import type { Client } from '../../../types';

// ReactRenderer is imported from @tiptap/react
import { ReactRenderer } from '@tiptap/react';
import { MentionList } from './MentionList';

export function createClientMentionExtension(clientsRef: MutableRefObject<Client[]>) {
  return Extension.create({
    name: 'clientMention',

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: '@',
          allowSpaces: false,
          startOfLine: false,

          items({ query }: { query: string }) {
            const q = query.toLowerCase();
            return clientsRef.current
              .filter((c) => c.name.toLowerCase().includes(q))
              .slice(0, 8);
          },

          command({ editor, range, props }: { editor: any; range: any; props: Client }) {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent({
                type: 'clientMention',
                attrs: { id: props.id, label: props.name },
              })
              .insertContent(' ')
              .run();
          },

          render() {
            let component: ReactRenderer<MentionListRef> | null = null;
            let el: HTMLDivElement | null = null;

            return {
              onStart(props: any) {
                el = document.createElement('div');
                el.style.position = 'fixed';
                el.style.zIndex = '9999';
                document.body.appendChild(el);
                component = new ReactRenderer(MentionList, { props, editor: props.editor });
                el.appendChild(component.element);
                const rect: DOMRect | null = props.clientRect?.();
                if (rect) {
                  el.style.top = `${rect.bottom + 4}px`;
                  el.style.left = `${rect.left}px`;
                }
              },
              onUpdate(props: any) {
                component?.updateProps(props);
                const rect: DOMRect | null = props.clientRect?.();
                if (rect && el) {
                  el.style.top = `${rect.bottom + 4}px`;
                  el.style.left = `${rect.left}px`;
                }
              },
              onKeyDown(props: { event: KeyboardEvent }) {
                if (props.event.key === 'Escape') {
                  el?.remove();
                  return true;
                }
                return component?.ref?.onKeyDown(props.event) ?? false;
              },
              onExit() {
                el?.remove();
                component?.destroy();
              },
            };
          },
        }),
      ];
    },
  });
}
