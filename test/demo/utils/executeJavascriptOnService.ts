import { getConnection } from "../../provider/utils/connect";
import { Fin } from "hadouken-js-adapter";

/**
 * Executes javascript code on the service
 * @param script
 */
export async function executeJavascriptOnService(script: string): Promise<any> {
    const fin: Fin = await getConnection();
    return new Promise((resolve, reject) => {
        fin.InterApplicationBus.subscribe({ uuid: "layouts-service", name: "layouts-service" }, "replytest", (message: string) => { console.log(message); resolve(message); })
        fin.InterApplicationBus.send({ uuid: "layouts-service", name: "layouts-service" }, 'test', script);
    });
}