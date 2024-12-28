export class IncrementalOutputProcessor {
    private hasFailed = false;
    private errorReason: string | null = null;
    private callback: (status: 'pass' | 'fail', errorReason?: string) => void;

    constructor(callback: (status: 'pass' | 'fail', errorReason?: string) => void) {
        this.callback = callback;
    }

    processChunk(chunk: string) {
        const lines = chunk.split('\n').map((line) => line.trim());

        lines.forEach((line) => {
            if (line.includes('FAILED')) {
                this.hasFailed = true;
            }

            if (this.hasFailed && !line.startsWith('====') && !line.startsWith('/') && !line.includes('FAILED')) {
                if (!this.errorReason) {
                    this.errorReason = line;
                } else {
                    this.errorReason += `\n${line}`;
                }
            }
        });
    }

    finalizeProcessing() {
        const finalStatus = this.hasFailed ? 'fail' : 'pass';
        this.callback(finalStatus, this.errorReason?.trim());
    }
}
