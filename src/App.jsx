import HomeScreen from "./components/HomeScreen";
import StartScreen from "./components/StartScreen";
import ChatCheck from "./components/ChatCheck";
import ResultScreen from "./components/ResultScreen";
import HistoryScreen from "./components/HistoryScreen";
import TemplateManager from "./components/admin/TemplateManager";
import TemplateEditor from "./components/admin/TemplateEditor";
import InstallPrompt from "./components/InstallPrompt";
import Toast from "./components/common/Toast";
import LoadingOverlay from "./components/common/LoadingOverlay";
import { useNavigation } from "./hooks/useNavigation";
import { SCREENS } from "./constants/screens";

/**
 * メインアプリケーションコンポーネント
 *
 * 画面ルーティングと全体レイアウトを担う。
 * ナビゲーション状態・ハンドラはすべて useNavigation フックに委譲する。
 */
export default function App() {
  const {
    screen,
    viewHistorySession,
    isEditingAfterComplete,
    isCapturingGps,
    editingTemplate,
    session,
    resumeSession,
    saveError,
    syncWarning,
    handleStartNew,
    handleResume,
    handleCheckStart,
    handleComplete,
    handleEditFromResult,
    handleMemoUpdate,
    handleExit,
    handleRestart,
    handleGoHome,
    handleOpenHistory,
    handleOpenAdmin,
    handleEditTemplate,
    handleSaveTemplate,
    handleViewHistoryDetail,
    handleBackToHistory,
    handleBackFromAdmin,
    handleBackFromEditor,
    handleBackFromStart,
    clearSaveError,
    clearSyncWarning,
  } = useNavigation();

  return (
    <div className="app">
      <InstallPrompt />
      {isCapturingGps && <LoadingOverlay message="位置情報を取得中..." />}

      {screen === SCREENS.HOME && (
        <HomeScreen
          onStartNew={handleStartNew}
          onResume={handleResume}
          resumeSession={resumeSession}
          onOpenHistory={handleOpenHistory}
          onOpenAdmin={handleOpenAdmin}
        />
      )}

      {screen === SCREENS.ADMIN_TEMPLATES && (
        <TemplateManager
          onBack={handleBackFromAdmin}
          onEditTemplate={handleEditTemplate}
        />
      )}

      {screen === SCREENS.ADMIN_EDITOR && editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onBack={handleBackFromEditor}
          onSave={handleSaveTemplate}
        />
      )}

      {screen === SCREENS.START && (
        <StartScreen
          onStart={handleCheckStart}
          onBack={handleBackFromStart}
        />
      )}

      {screen === SCREENS.CHECK && session && (
        <ChatCheck
          onComplete={handleComplete}
          onExit={handleExit}
          isEditingAfterComplete={isEditingAfterComplete}
        />
      )}

      {screen === SCREENS.HISTORY && (
        <HistoryScreen
          onBack={handleBackFromAdmin}
          onViewHistory={handleViewHistoryDetail}
        />
      )}

      {screen === SCREENS.RESULT && (session || viewHistorySession) && (
        <ResultScreen
          sessionOverride={viewHistorySession}
          isReadOnly={!!viewHistorySession}
          onRestart={handleRestart}
          onGoHome={viewHistorySession ? handleBackToHistory : handleGoHome}
          onEdit={viewHistorySession ? undefined : handleEditFromResult}
          onUpdateMemo={viewHistorySession ? undefined : handleMemoUpdate}
        />
      )}

      {saveError && (
        <Toast message={saveError} type="error" onClose={clearSaveError} />
      )}
      {syncWarning && (
        <Toast message={syncWarning} type="warning" autoClose={false} onClose={clearSyncWarning} />
      )}
    </div>
  );
}
