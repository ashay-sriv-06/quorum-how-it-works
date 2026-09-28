import { ButtonLink } from "../components/Button";

export function NotFound({ what = "page" }: { what?: string }) {
  return (
    <div className="wrap py-24 md:py-36 max-w-3xl">
      <p className="eyebrow text-muted">404</p>
      <h1 className="display display-lg mt-5">This seat doesn’t exist.</h1>
      <p className="mt-6 text-[18px] text-muted">We couldn’t find that {what}. It may have been renamed, or never launched.</p>
      <div className="mt-10 flex flex-wrap gap-4">
        <ButtonLink to="/explore" arrow="up-right">
          Explore gatherings
        </ButtonLink>
        <ButtonLink to="/" variant="outline">
          Go home
        </ButtonLink>
      </div>
    </div>
  );
}
