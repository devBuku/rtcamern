import { Fragment } from 'react'
import { useSelectedConversation } from '../../hooks/useSelectedConversation'
import useScrollToBottom from '../../hooks/useScrollToBottom'
import { useChatStore } from '../../store/useChatStore'
import { MessageBubble } from './MessageBubble'
import { NoConversationPlaceholder } from './NoConversationPlaceholder'

export function MessageList() {
  const { activeConversation, activeConversationId } = useSelectedConversation()
  const isMessagesLoading = useChatStore((state) => state.isMessagesLoading)

  const lastMessageId = activeConversation?.messages.at(-1)?.id
  const messagesScrollRef = useScrollToBottom(
    activeConversationId,
    lastMessageId,
  )

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {activeConversation ? (
        <div
          ref={messagesScrollRef}
          className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-3 sm:py-4"
        >
          {isMessagesLoading && activeConversation.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Loading messages...
            </p>
          ) : activeConversation.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No messages yet. Say hello!
            </p>
          ) : (
            activeConversation.messages.map((message, index) => {
              const previousMessage = activeConversation.messages[index - 1]

              return (
                <Fragment key={message.id}>
                  {message.dateLabel !== previousMessage?.dateLabel ? (
                    <p className="mb-3 mt-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted">
                      {message.dateLabel}
                    </p>
                  ) : null}
                  <MessageBubble message={message} />
                </Fragment>
              )
            })
          )}
        </div>
      ) : (
        <NoConversationPlaceholder />
      )}
    </div>
  )
}
