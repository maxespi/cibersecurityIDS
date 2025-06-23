// components/shared/LogsComponent.tsx
interface LogsComponentProps {
    title: string;
    logType: 'user' | 'script' | 'system';
    height?: string;
    showControls?: boolean;
}

const LogsComponent: React.FC<LogsComponentProps> = ({
    title,
    logType,
    height = 'h-64',
    showControls = false
}) => {
    const { logs, loading } = useLogs(logType);

    return (
        <div className="glass-effect rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <LogIcon type={logType} />
                {title}
            </h3>
            {showControls && <LogsControls />}
            <div className={`bg-white bg-opacity-10 rounded-lg p-4 ${height} overflow-y-auto`}>
                <LogsDisplay logs={logs} loading={loading} />
            </div>
        </div>
    );
};