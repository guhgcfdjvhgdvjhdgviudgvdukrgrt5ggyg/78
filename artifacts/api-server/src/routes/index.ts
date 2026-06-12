import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import postsRouter from "./posts";
import commentsRouter from "./comments";
import eventsRouter from "./events";
import announcementsRouter from "./announcements";
import chatRouter from "./chat";
import usersRouter from "./users";
import notificationsRouter from "./notifications";
import dmRouter from "./dm";
import heartbeatRouter from "./heartbeat";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(postsRouter);
router.use(commentsRouter);
router.use(eventsRouter);
router.use(announcementsRouter);
router.use(chatRouter);
router.use(usersRouter);
router.use(notificationsRouter);
router.use(dmRouter);
router.use(heartbeatRouter);

export default router;
