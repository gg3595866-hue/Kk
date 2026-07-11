import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proxyRouter from "./proxy";
import extPingRouter from "./ext-ping";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/proxy", proxyRouter);
router.use(extPingRouter);

export default router;
