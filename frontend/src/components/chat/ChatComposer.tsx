import { Button, TextArea } from '@heroui/react'
import { ImageIcon, LoaderIcon, SendHorizontalIcon } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'
import { useSelectedConversation } from '../../hooks/useSelectedConversation'
import useKeyboardSound from '../../hooks/useKeyboardSound'
import { useChatStore } from '../../store/useChatStore'

export function ChatComposer() {
  const composerText = useChatStore((state) => state.composerText)
  const isSoundEnabled = useChatStore((state) => state.isSoundEnabled)
  const isSendingMedia = useChatStore((state) => state.isSendingMedia)
  const isSendingMessage = useChatStore((state) => state.isSendingMessage)
  const sendMediaMessage = useChatStore((state) => state.sendMediaMessage)
  const sendTextMessage = useChatStore((state) => state.sendTextMessage)
  const setComposerText = useChatStore((state) => state.setComposerText)

  const { activeConversationId } = useSelectedConversation()
  const { playRandomKeyStrokeSound } = useKeyboardSound()
  const mediaInputRef = useRef<HTMLInputElement>(null)

  const isSending = isSendingMedia || isSendingMessage

  const playSoundIfEnabled = () => {
    if (isSoundEnabled) playRandomKeyStrokeSound()
  }

  const handleSend = async () => {
    if (!composerText.trim() || isSendingMessage) return

    const didSendMessage = await sendTextMessage(activeConversationId)
    if (didSendMessage) playSoundIfEnabled()
  }

  const handleComposerTextChange = (
    event: ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setComposerText(event.target.value)
    playSoundIfEnabled()
  }

  const handleMediaPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const didSendMessage = await sendMediaMessage({
      conversationId: activeConversationId,
      file,
    })

    if (didSendMessage) playSoundIfEnabled()
  }

  return (
    <footer className="shrink-0 border-t border-border px-1.5 pb-2 pt-2 sm:px-2">
      {isSendingMedia ? (
        <div className="mx-auto mb-2 flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
          <LoaderIcon
            className="size-4 shrink-0 animate-spin text-accent"
            strokeWidth={2}
            aria-hidden
          />
          <span className="truncate">Uploading media...</span>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-full items-end gap-1.5 px-0.5 sm:gap-2 sm:px-1">
        <input
          ref={mediaInputRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          disabled={isSending}
          tabIndex={-1}
          aria-hidden
          onChange={handleMediaPick}
        />

        <Button
          variant="ghost"
          isIconOnly
          isDisabled={isSending}
          className="size-9 shrink-0 touch-manipulation self-end text-accent"
          aria-label="Attach media"
          onPress={() => mediaInputRef.current?.click()}
        >
          <ImageIcon className="size-5 sm:size-6" strokeWidth={2} aria-hidden />
        </Button>

        <TextArea
          fullWidth
          variant="secondary"
          placeholder="iMessage"
          rows={1}
          value={composerText}
          onChange={handleComposerTextChange}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void handleSend()
            }
          }}
          className="flex-1 rounded-full"
        />

        <Button
          variant="primary"
          isIconOnly
          isDisabled={!composerText.trim() || isSendingMessage}
          aria-label="Send message"
          onPress={() => void handleSend()}
        >
          <SendHorizontalIcon className="size-5" strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </footer>
  )
}
