import prismaRequestHandler from "@/lib/server/prismaRequestHandler";
import prisma from "@/lib/services/prismadb";
import { hasNullUndefined } from "@/utils/validation/checkNullUndefined";
import { MenuItem, MenuItemStatus } from "@prisma/client";
import { ValidationError } from "yup";

export interface CreateMenuItemParams {
  categoryId: string;
  subCategoryId?: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  displayOrder?: number;
  status?: MenuItemStatus;
}

export async function getAllMenuItemsByCategoryIdAndSub(
  menuCategoryId: string | null | undefined,
  menuSubCategoryId?: string | null
): Promise<MenuItem[] | null> {
  if (!menuCategoryId) {
    return null;
  }

  return prismaRequestHandler(
    prisma.menuItem.findMany({
      where: {
        categoryId: menuCategoryId,
        subCategoryId: menuSubCategoryId,
      },
    }),
    "getAllMenuItemsByCategoryIdAndSub"
  );
}

export async function createMenuItem(
  menuItemInfo: CreateMenuItemParams
): Promise<MenuItem> {
  if (hasNullUndefined(menuItemInfo)) {
    throw new ValidationError(
      "Failed to create menu item. Please try again later"
    );
  }

  return prismaRequestHandler(
    prisma.menuItem.create({
      data: {
        categoryId: menuItemInfo.categoryId,
        subCategoryId: menuItemInfo.subCategoryId,
        name: menuItemInfo.name,
        description: menuItemInfo.description,
        price: menuItemInfo.price,
        imageUrl: menuItemInfo.imageUrl,
        displayOrder: menuItemInfo.displayOrder,
        status: menuItemInfo.status,
      },
    }),
    "createMenuItem"
  );
}

export async function getAllMenuItems(): Promise<MenuItem[] | null> {
  return null;
}
