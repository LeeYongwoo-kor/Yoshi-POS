import prismaRequestHandler from "@/lib/server/prisma/prismaRequestHandler";
import prisma from "@/lib/services/prismadb";
import { ValidationError } from "@/lib/shared/error/ApiError";
import checkNullUndefined from "@/utils/validation/checkNullUndefined";
import { Order, OrderStatus, Prisma } from "@prisma/client";
import { IOrderRequestForDashboard } from "./orderRequest";
import { IRestaurantTable } from "./restaurantTable";

export interface IOrder extends Order {
  table: IRestaurantTable;
}

export interface IOrderForDashboard extends Order {
  orderRequests: IOrderRequestForDashboard[];
}

export async function getOrdersByTableId(
  restaurantTableId: string | undefined | null
): Promise<Order[] | null> {
  if (!restaurantTableId) {
    return null;
  }

  return prismaRequestHandler(
    prisma.order.findMany({
      where: {
        tableId: restaurantTableId,
      },
    }),
    "getOrdersByRestaurantTableId"
  );
}

export async function getActiveOrderByTableIdAndOrderId(
  orderId: string | undefined | null,
  restaurantTableId: string | undefined | null
): Promise<Order | null> {
  if (!restaurantTableId || !orderId) {
    return null;
  }

  return prismaRequestHandler(
    prisma.order.findFirst({
      where: {
        id: orderId,
        tableId: restaurantTableId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.ORDERED],
        },
      },
      include: {
        table: {
          include: {
            restaurant: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    "getActiveOrderByTableIdAndOrderId"
  );
}

export async function getActiveOrderById(
  orderId: string | undefined | null
): Promise<Order | null> {
  if (!orderId) {
    return null;
  }

  return prismaRequestHandler(
    prisma.order.findFirst({
      where: {
        id: orderId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.ORDERED],
        },
      },
      include: {
        table: {
          include: {
            restaurant: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    "getActiveOrderById"
  );
}

export async function getActiveOrderByTableId(
  restaurantTableId: string | undefined | null
): Promise<Order | null> {
  if (!restaurantTableId) {
    return null;
  }

  return prismaRequestHandler(
    prisma.order.findFirst({
      where: {
        tableId: restaurantTableId,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.ORDERED],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    "getActiveOrderByTableId"
  );
}

export async function getCompletedOrdersByTableId(
  restaurantTableId: string | undefined | null
): Promise<Order[] | null> {
  if (!restaurantTableId) {
    return null;
  }

  return prismaRequestHandler(
    prisma.order.findMany({
      where: {
        tableId: restaurantTableId,
        status: OrderStatus.COMPLETED,
      },
    }),
    "getCompletedOrdersByTableId"
  );
}

export async function getAllOrder(): Promise<Order[] | null> {
  return null;
}

export async function createOrder(
  restaurantTableId: string,
  customerName?: string
): Promise<Order> {
  if (!restaurantTableId) {
    throw new ValidationError("Failed to create order");
  }

  return prismaRequestHandler(
    prisma.order.create({
      data: {
        tableId: restaurantTableId,
        status: customerName ? OrderStatus.PENDING : OrderStatus.ORDERED,
        customerName: customerName || "",
      },
    }),
    "createOrder"
  );
}

export async function updateOrderById<
  T extends Partial<Omit<Order, "id" | "tableId">>
>(orderId: string | undefined | null, updateInfo: T): Promise<Order> {
  const { hasNullUndefined } = checkNullUndefined(updateInfo);

  if (!orderId || hasNullUndefined) {
    throw new ValidationError("Failed to update order. Please try again later");
  }

  return prismaRequestHandler(
    prisma.order.update({
      where: {
        id: orderId,
      },
      data: updateInfo as Prisma.OrderUpdateInput,
    }),
    "updateOrderById"
  );
}
