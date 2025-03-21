import { getFunctionBySource } from "@webpack";
import type React from "react";
import components from "../common/components";
import type { Variant } from "./Text";

enum HelpMessageTypes {
  WARNING = 0,
  INFO,
  ERROR,
  POSITIVE,
}
interface HelpMessageProps {
  children: React.ReactNode;
  messageType: (typeof HelpMessageTypes)[keyof typeof HelpMessageTypes];
  textColor?: string;
  textVariant?: Variant;
  className?: string;
}

export type NoticeType = React.FC<HelpMessageProps> & {
  Types: typeof HelpMessageTypes; // for backwards compat
  HelpMessageTypes: typeof HelpMessageTypes;
};
const getNotice = async (): Promise<NoticeType> => {
  const HelpMessage = getFunctionBySource<NoticeType>(await components, "messageType:")!;
  HelpMessage.HelpMessageTypes = HelpMessageTypes;
  HelpMessage.Types = HelpMessage.HelpMessageTypes;
  return HelpMessage;
};

export default getNotice();
