import { FC, memo } from 'react'
import dropdownIcon from '~/assets/icons/dropdown.svg'
import { BotId } from '~app/bots'
import SwitchBotDropdown from '../SwitchBotDropdown'
import Tooltip from '../Tooltip'
import { ChatMessageModel } from '~types'

interface Props {
  botId: BotId
  name: string 
  model: string | undefined
  fullName?: string
  onSwitchBot?: (botId: BotId, messages?: ChatMessageModel[]) => void
  messages?: ChatMessageModel[] // 会話履歴を受け取るためのプロパティを追加
}

const ChatbotName: FC<Props> = (props) => {
  const node = (
    <Tooltip content={props.fullName || props.name}>
      <span className="font-semibold text-primary-text text-sm cursor-pointer">{props.name}</span>
    </Tooltip>
  )

  const modelNode = props.model ? (
    <Tooltip content={props.model}>
      <div className="bg-gray-200 text-gray-700 text-xs rounded-full px-2 py-1 ml-1 max-w-[200px]"> {/* max-widthを追加 */}
        <div className="truncate">
        {props.model}
      </div>
      </div>
    </Tooltip>
  ) : null;

  if (!props.onSwitchBot) {
    return (
      <div className="flex items-center">
        {node}
        {modelNode}
      </div>
    )
  }
  const triggerNode = (
    <div className="flex flex-row items-center gap-[2px]">
      {node}
      {modelNode} 
      <img src={dropdownIcon} className="w-5 h-5" />
    </div>
  )
  // 親コンポーネントから渡されたmessagesを使用
  return <SwitchBotDropdown 
    selectedBotId={props.botId} 
    onChange={(botId, messages) => {
      console.log('ChatbotName onChange called with messages:', messages);
      // 親コンポーネントのonSwitchBotを呼び出す際に、第2引数としてmessagesを渡す
      return props.onSwitchBot?.(botId, messages);
    }} 
    triggerNode={triggerNode}
    // ConversationPanelから渡されたmessagesを使用
    messages={props.messages}
  />
}

export default memo(ChatbotName)
