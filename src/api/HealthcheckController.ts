import Express, {Request, Response} from "express";
import GenericResponse, {GenericResponseStructure} from "./contract/GenericResponse";

const router = Express.Router()

router.get('/ping', async (req: Request, res: Response<GenericResponseStructure<any>>) => {
    return GenericResponse.ofStatusAndMessage(res, 200, "PONG");
});

export default router;