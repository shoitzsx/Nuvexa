import type { TransactionCategory, TransactionType } from "../types/transactions";

export const transactionTypes: TransactionType[] = ["income", "expense"];

export const defaultTransactionCategories: TransactionCategory[] = [
  "Alimentação",
  "Moradia",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Assinaturas",
  "Dívidas",
  "Salário",
  "Investimentos",
  "Outros",
];

const customCategoriesStorageKey = "finantrack-custom-categories";

export function getCustomTransactionCategories(): TransactionCategory[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(customCategoriesStorageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter(
        (category): category is TransactionCategory =>
          typeof category === "string" && category.trim().length > 0,
      )
      .map((category) => category.trim());
  } catch {
    return [];
  }
}

export function getTransactionCategories(): TransactionCategory[] {
  const customCategories = getCustomTransactionCategories();
  const categoriesWithoutOthers = defaultTransactionCategories.filter(
    (category) => category !== "Outros",
  );

  return [
    ...categoriesWithoutOthers,
    ...customCategories.filter(
      (category) => !defaultTransactionCategories.includes(category),
    ),
    "Outros",
  ];
}

export function addTransactionCategory(categoryName: string): TransactionCategory {
  const normalizedCategory = categoryName.trim().replace(/\s{2,}/g, " ");

  if (normalizedCategory.length === 0) {
    throw new Error("Informe uma categoria válida.");
  }

  const existingCategories = getTransactionCategories();
  const categoryExists = existingCategories.some(
    (category) => category.toLowerCase() === normalizedCategory.toLowerCase(),
  );

  if (categoryExists) {
    throw new Error("Essa categoria já existe.");
  }

  const nextCustomCategories = [
    ...getCustomTransactionCategories(),
    normalizedCategory,
  ];

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      customCategoriesStorageKey,
      JSON.stringify(nextCustomCategories),
    );
  }

  return normalizedCategory;
}

export const transactionCategories = getTransactionCategories();

export const transactionTypeLabels: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
};

export const emptyTransactionFilters = {
  search: "",
  type: "all",
  category: "all",
  startDate: "",
  endDate: "",
} satisfies import("../types/transactions").TransactionFilters;
