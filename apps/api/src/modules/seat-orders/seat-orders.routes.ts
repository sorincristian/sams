import { Router } from "express";
import { 
  getOrders, 
  getOrder, 
  getOrderLogs,
  createOrder, 
  updateOrder, 
  submitOrder, 
  approveOrder,
  receiveOrder
} from "./seat-orders.controller.js";
import { requireAuth } from "../../auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", getOrders);
router.post("/", createOrder);
router.get("/:id", getOrder);
router.get("/:id/logs", getOrderLogs);
router.patch("/:id", updateOrder);
router.post("/:id/submit", submitOrder);
router.post("/:id/approve", approveOrder);
router.post("/:id/receive", receiveOrder);

export default router;
