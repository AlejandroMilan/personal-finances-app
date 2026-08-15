export interface CategoryView {
  id: string;
  name: string;
  color: string;
}

export interface CreateCategoryPayload {
  name: string;
  color: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  color?: string;
}
