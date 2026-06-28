type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  stock: number;
  active: boolean;
  categoryId: string;
};

// Explicit <label for> / id associations (not wrapping) so testRigor resolves
// each caption to the INPUT — important for `grab value from "Stock"`, which
// must return the field's numeric value rather than the label text.
export default function ProductForm({
  action,
  categories,
  product,
}: {
  action: (formData: FormData) => void;
  categories: Category[];
  product?: Product;
}) {
  return (
    <form action={action} style={{ maxWidth: 520 }}>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <p>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" name="name" defaultValue={product?.name ?? ""} required />
      </p>
      <p>
        <label htmlFor="slug">Slug</label>
        <input id="slug" type="text" name="slug" defaultValue={product?.slug ?? ""} />
      </p>
      <p>
        <label htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={4} defaultValue={product?.description ?? ""} />
      </p>
      <p>
        <label htmlFor="price">Price</label>
        <input
          id="price"
          type="text"
          name="price"
          defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""}
          required
        />
      </p>
      <p>
        <label htmlFor="imageUrl">Image URL</label>
        <input id="imageUrl" type="text" name="imageUrl" defaultValue={product?.imageUrl ?? ""} />
      </p>
      {product ? (
        /* EDIT: the stock readout for `grab value from "Stock"`. The match must
           come from the `title` attribute (a tooltip), NOT aria-label: an
           aria-label sets the accessible NAME to "Stock", and testRigor
           intermittently returned that name ("Stock") instead of the visible
           "46", breaking `save expression "Stock - Stock"`. With title-only,
           the accessible name derives from the content ("46"), so every return
           path — visible text or accessible name — yields the number. The
           editable field below is "Adjust quantity" so it never collides. */
        <p>
          <span title="Stock">{product.stock}</span>
        </p>
      ) : null}
      <p>
        <label htmlFor="stock">{product ? "Adjust quantity" : "Stock"}</label>
        <input
          id="stock"
          type="text"
          inputMode="numeric"
          name="stock"
          defaultValue={product?.stock ?? 0}
          required
        />
      </p>
      <p>
        <label htmlFor="categoryId">Category</label>
        <select id="categoryId" name="categoryId" defaultValue={product?.categoryId ?? ""} required>
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </p>
      <div className="checkbox-row">
        <input
          type="checkbox"
          id="active"
          name="active"
          defaultChecked={product ? product.active : false}
        />
        <label htmlFor="active" style={{ margin: 0 }}>
          Active
        </label>
      </div>
      <p>
        <button type="submit">Save</button>
      </p>
    </form>
  );
}
