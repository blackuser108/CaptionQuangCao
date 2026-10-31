import Link from 'next/link';
import type { Metadata } from 'next';
import AuthActions from '../../components/AuthActions';
import PasswordLogin from '../../components/PasswordLogin';
export const metadata: Metadata = { title: 'Đăng nhập' };
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <div className="wrap login-layout"><aside className="login-aside"><div><p className="eyebrow">Tài khoản là lựa chọn bổ sung</p><h2>Bắt đầu viết,<br />không cần chờ đăng nhập.</h2>
    <div className="local-diagram"><div><span className="serif">Khách</span>Dùng đủ năm chức năng<br />Lịch sử trên trình duyệt</div><div><span className="serif">Tài khoản</span>Đăng nhập tùy chọn<br />Lịch sử tài khoản riêng</div></div></div>
    <p className="small muted">Lịch sử khách và tài khoản tách riêng trên trình duyệt. Không tự nhập, không đồng bộ thiết bị; localStorage không phải kho bảo mật.</p></aside>
    <section className="login-card"><p className="eyebrow">Đường dùng khách luôn mở</p><h1>Chào bạn,<br />mời vào bàn.</h1><p>Đăng nhập bằng email hoặc Google để dùng vùng lịch sử tài khoản riêng trên trình duyệt này. Bạn cũng có thể dùng công cụ ngay mà không tạo tài khoản.</p>
      {params.error && <p role="alert">Chưa đăng nhập được hoặc bạn đã hủy. Hãy thử lại; nếu dịch vụ chưa sẵn sàng, bạn vẫn dùng khách được.</p>}
      <PasswordLogin /><div className="separator">hoặc dùng Google</div><AuthActions /><div className="separator">hoặc</div>
      <Link className="button ghost" href="/create">Tiếp tục không đăng nhập <span aria-hidden="true">↗</span></Link>
      <p className="small">Tạo nội dung, copy, tạo lại, lịch sử và bộ đếm đều dùng được ở chế độ khách.</p><p className="small"><Link href="/account">Xem trạng thái tài khoản →</Link></p>
    </section></div>;
}
