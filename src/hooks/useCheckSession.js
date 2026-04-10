import { useContext } from "react";
import { CheckSessionContext } from "../providers/CheckSessionContext";

/**
 * チェックセッションを操作するためのカスタムフック
 * ビジネスロジックの抽象化レイヤーとして機能する
 */
export function useCheckSession() {
  const context = useContext(CheckSessionContext);
  
  if (!context) {
    throw new Error("useCheckSession must be used within a CheckSessionProvider");
  }

  // 算出プロパティなどを追加して返す
  return {
    ...context,
    progress: context.session?.answers?.length || 0,
  };
}
