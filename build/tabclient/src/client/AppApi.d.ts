import { Api } from "./Api";
export declare class AppApi extends Api {
    private _ID;
    constructor();
    init(url?: string | undefined, height?: number | undefined): void;
    deregister(): void;
}
