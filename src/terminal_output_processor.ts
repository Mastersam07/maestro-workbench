export class IncrementalOutputProcessor {
    private currentFile: string | null = null;
    private hasFailed: boolean = false;
    private errorReason: string | null = null;
    private fileResults: Map<string, 'pass' | 'fail'> = new Map();
    private folderCallback: (status: 'pass' | 'fail') => void;
    private fileCallback: (fileName: string, status: 'pass' | 'fail') => void;

    constructor(
        folderCallback: (status: 'pass' | 'fail', errorReason?: string) => void,
        fileCallback: (fileName: string, status: 'pass' | 'fail', errorReason?: string) => void
    ) {
        this.folderCallback = folderCallback;
        this.fileCallback = fileCallback;
    }

    processChunk(chunk: string) {
        const lines = chunk.split('\n').map((line) => line.trim());

        console.log(lines);

        lines.forEach((line) => {
            // Match lines for folder tests
            const passedMatch = line.match(/^\[Passed\] (.+?) \(\d+s\)$/);
            const failedMatch = line.match(/^\[Failed\] (.+?) \(\d+s\)/);

            if (passedMatch) {
                const fileName = passedMatch[1];
                this.fileResults.set(fileName, 'pass');
                this.fileCallback(fileName, 'pass');
            } else if (failedMatch) {
                const fileName = failedMatch[1];
                this.fileResults.set(fileName, 'fail');
                this.fileCallback(fileName, 'fail');
            } else {
                if (line.includes('COMPLETED')) {
                    if (this.currentFile) {
                        this.fileResults.set(this.currentFile, 'pass');
                    }
                } else if (line.includes('FAILED')) {
                    this.hasFailed = true;
                }

                if (this.hasFailed && !line.startsWith('====') && !line.startsWith('/') && !line.includes('FAILED')) {
                    if (!this.errorReason) {
                        this.errorReason = line;
                    } else {
                        this.errorReason += `\n${line}`;
                    }
                }
            }
        });
    }

    finalizeProcessing() {
        if (this.currentFile && this.fileResults.has(this.currentFile)) {
            const finalStatus = this.hasFailed ? 'fail' : 'pass';
            this.fileResults.set(this.currentFile, finalStatus);
            this.fileCallback(this.currentFile, finalStatus);
        }

        const hasAnyFailed = Array.from(this.fileResults.values()).some((status) => status === 'fail');
        const folderStatus = hasAnyFailed ? 'fail' : 'pass';
        this.folderCallback(folderStatus);
    }

    setCurrentFile(fileName: string) {
        this.currentFile = fileName;
        this.hasFailed = false;
        this.errorReason = null;
    }
}
