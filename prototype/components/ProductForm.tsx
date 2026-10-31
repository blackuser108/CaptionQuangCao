import type { Input } from '../lib/content';
import { cleanInput, count, fields } from '../lib/content';

type Props = {
  input: Input;
  busy: boolean;
  errors: Partial<Record<keyof Input, string>>;
  onChange: (input: Input) => void;
  onBlur: (key: keyof Input) => void;
  onSubmit: () => void;
};

export default function ProductForm({ input, busy, errors, onChange, onBlur, onSubmit }: Props) {
  return (
    <section className="form-panel panel" aria-labelledby="form-title">
      <h2 id="form-title" tabIndex={-1}>
        Thông tin sản phẩm
      </h2>
      <p className="muted small">Cả 4 trường đều bắt buộc (*).</p>
      <form id="product-form" noValidate onSubmit={event => { event.preventDefault(); onSubmit(); }}>
        {Object.keys(errors).length > 0 && (
          <div id="form-errors" className="notice error" tabIndex={-1}>
            <strong>Kiểm tra lại thông tin sản phẩm.</strong>
            <ul>
              {Object.entries(errors).map(([key, message]) => (
                <li key={key}>
                  <a href={`#${key}`}>{message}</a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <fieldset disabled={busy} className="input-fields">
          <legend className="sr-only">Thông tin để tạo nội dung</legend>
          {(Object.entries(fields) as [keyof typeof fields, typeof fields.productName][]).map(([key, field]) => {
            const props = {
              id: key,
              name: key,
              value: input[key],
              required: true,
              'aria-invalid': !!errors[key],
              'aria-describedby': `${key}-hint ${key}-count${errors[key] ? ` ${key}-error` : ''}`,
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                onChange({ ...input, [key]: event.target.value }),
              onBlur: () => onBlur(key),
            };
            return (
              <div className="field" key={key}>
                <label htmlFor={key}>
                  {field.label} <span aria-hidden="true">*</span>
                </label>
                {key === 'productName' ? <input {...props} /> : <textarea {...props} rows={key === 'description' ? 4 : 2} />}
                <div className="field-meta">
                  <span id={`${key}-hint`}>{field.hint}</span>
                  <span id={`${key}-count`}>
                    {count(cleanInput(input)[key])}/{field.limit.toLocaleString('vi-VN')}
                  </span>
                </div>
                {errors[key] && (
                  <p className="field-error" id={`${key}-error`}>
                    {errors[key]}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
        <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
        <p className="small muted">Đếm ký tự sau chuẩn hóa, bỏ khoảng trắng ở đầu/cuối.</p>
      </form>
    </section>
  );
}
