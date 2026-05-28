import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = any.parse({ status: "ok" });
  res.json(data);
});

export default router;
