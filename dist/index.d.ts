/// <reference types="node" />
export declare function checkFile(input: File | Buffer, filename?: string): Promise<{
    ok: boolean;
    msg: string;
}>;
