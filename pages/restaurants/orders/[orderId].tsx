import Menu from "@/components/menu/Menu";
import OrderNotification from "@/components/order/OrderNotification";
import { ORDER_ENDPOINT, ORDER_REQUEST_ENDPOINT } from "@/constants/endpoint";
import { COMMON_ERROR } from "@/constants/errorMessage/client";
import { Method } from "@/constants/fetch";
import { ERROR_URL } from "@/constants/url";
import { IOrder, getOrderById } from "@/database";
import useAnnouncement from "@/hooks/fetch/useAnnouncement";
import { useToast } from "@/hooks/useToast";
import useMutation from "@/lib/client/useMutation";
import { ApiError, NotFoundError } from "@/lib/shared/error/ApiError";
import { IPatchOrderRequestBody } from "@/pages/api/v1/orders/[orderId]/requests";
import { IOrderInfo, orderInfoState } from "@/recoil/state/orderState";
import convertDatesToISOString from "@/utils/converter/convertDatesToISOString";
import convertDatesToIntlString from "@/utils/converter/convertDatesToIntlString";
import convertNumberToOrderNumber from "@/utils/converter/convertNumberToOrderNumber";
import isEmpty from "@/utils/validation/isEmpty";
import { OrderStatus, Prisma, TableStatus } from "@prisma/client";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import useSWR, { SWRConfig } from "swr";

type OrderPageProps = {
  order: IOrder | undefined;
  initErrMsg: string | undefined;
  notFound: boolean | undefined;
};

type PageProps = {
  fallback: any;
  orderId: string;
  initErrMsg: string | undefined;
  notFound: boolean | undefined;
};

function OrderPage({ order, initErrMsg, notFound }: OrderPageProps) {
  const router = useRouter();
  const { announcements } = useAnnouncement(order?.id);
  const { data: orderFreshData, error: orderFreshError } = useSWR<IOrder>(
    order ? `${ORDER_ENDPOINT.BASE(order.id)}` : null
  );
  const [
    updateOrderRequestRejectFlag,
    { error: updateOrderRequestRejectFlagErr },
  ] = useMutation<Prisma.BatchPayload, IPatchOrderRequestBody>(
    order ? ORDER_REQUEST_ENDPOINT.BASE(order.id) : null,
    Method.PATCH
  );
  const { addToast } = useToast();
  const setOrderInfo = useSetRecoilState(orderInfoState);

  useEffect(() => {
    const announcedAndUpdateStatus = async () => {
      if (announcements && !isEmpty(announcements)) {
        announcements.forEach((announcement) => {
          if (announcement.rejectedReason) {
            addToast(
              "preserve",
              `注文していただいたリクエスト番号：${convertNumberToOrderNumber(
                announcement.orderRequestNumber
              )}
              注文時間: ${convertDatesToIntlString(announcement.createdAt)}
                ${announcement.orderItems && announcement.orderItems[0].name} ${
                announcement.orderItems.length > 1
                  ? `以外${announcement.orderItems.length}つ`
                  : ""
              }の商品が以下のの理由でキャンセルされました。
              申し訳ございませんが、他の商品をご注文ください。
              理由：「${announcement.rejectedReason}」`,
              "big"
            );
          }
        });

        await updateOrderRequestRejectFlag({ rejectedFlag: false });
      }
    };
    announcedAndUpdateStatus();
  }, [announcements]);

  useEffect(() => {
    if (orderFreshData) {
      const { id, status, table } = orderFreshData;
      const orderInfo: IOrderInfo = {
        orderId: id,
        orderStatus: status,
        tableId: table.id,
        tableNumber: table.number,
      };
      setOrderInfo(orderInfo);
    }
  }, [orderFreshData]);

  useEffect(() => {
    if (orderFreshError) {
      addToast("error", orderFreshError.message);
    }
  }, [orderFreshError]);

  useEffect(() => {
    if (updateOrderRequestRejectFlagErr) {
      addToast("error", updateOrderRequestRejectFlagErr.message);
    }
  }, [updateOrderRequestRejectFlagErr]);

  useEffect(() => {
    const hasErrors = async () => {
      if (initErrMsg) {
        await router.push(ERROR_URL.SERVER_ERROR);
        addToast("error", initErrMsg);
      }
      if (notFound) {
        await router.push(ERROR_URL.NOT_FOUND);
        addToast(
          "error",
          "Not found restaurant table. Please contact the staff"
        );
      }
    };
    hasErrors();
  }, [initErrMsg, notFound]);

  if (orderFreshData) {
    if (
      orderFreshData.table.status === TableStatus.RESERVED ||
      orderFreshData.status === OrderStatus.COMPLETED ||
      orderFreshData.status === OrderStatus.CANCELLED ||
      orderFreshData.status === OrderStatus.PENDING
    ) {
      return <OrderNotification orderInfo={orderFreshData} />;
    }
  }

  return order ? (
    <div className="h-fit">
      <div className="sticky top-0 z-30 flex flex-col w-full text-sm font-light text-white bg-slate-700">
        {/* table info */}
        <div className="flex justify-between">
          <span>
            🍔{order.table?.tableType} No: {order.table?.number}
          </span>
          <div className="flex space-x-1">
            <span>Open: {order.table?.restaurant?.startTime}</span>
            <span>~ {order.table?.restaurant?.endTime}</span>
          </div>
          <span>Last Order: {order.table?.restaurant?.lastOrder}</span>
        </div>
        {/* announcement */}
        <div></div>
      </div>
      <Menu restaurantInfo={order.table?.restaurant} role={"user"} />
    </div>
  ) : null;
}

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  try {
    const orderId = ctx.params?.orderId;
    if (!orderId || typeof orderId !== "string") {
      throw new NotFoundError("Not found restaurant table");
    }

    const decodedOrderId = Buffer.from(orderId, "base64").toString("utf-8");
    const order = convertDatesToISOString(await getOrderById(decodedOrderId));

    if (!order) {
      return {
        props: {
          fallback: {},
          notFound: true,
        },
      };
    }

    return {
      props: {
        fallback: {
          [ORDER_ENDPOINT.BASE(order.id)]: order,
        },
        orderId: order.id,
      },
    };
  } catch (err) {
    // TODO: Send error to Sentry
    const errMessage =
      err instanceof ApiError ? err.message : COMMON_ERROR.UNEXPECTED;
    console.error(err);
    return {
      props: {
        fallback: {},
        initErrMsg: errMessage,
      },
    };
  }
}

export default function Page({
  fallback,
  orderId,
  initErrMsg,
  notFound,
}: PageProps) {
  return (
    <SWRConfig value={{ fallback }}>
      <OrderPage
        order={fallback[ORDER_ENDPOINT.BASE(orderId)]}
        initErrMsg={initErrMsg}
        notFound={notFound}
      />
    </SWRConfig>
  );
}
