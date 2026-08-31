/**
 * The Privacy Policy text for Nexus.
 *
 * Kept as its own component so the provider stays a thin shell and the copy is
 * easy to find and revise. It uses only theme tokens — no new colours or fonts
 * — so it repaints correctly in light and dark like the rest of the product.
 *
 * The highlighted `[TODO: …]` markers are the details the club must fill in
 * before launch: a real contact email, the legal/postal identity, and
 * confirmation of the hosting provider. They are meant to be conspicuous.
 */

const EFFECTIVE_DATE = "31 August 2026";

function Todo({ children }) {
  return (
    <span className="rounded-[5px] bg-warn-soft px-1.5 py-0.5 text-[0.75rem] font-semibold text-warn">
      [TODO: {children}]
    </span>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h3 className="nx-display text-[0.95rem] text-ink">{title}</h3>
      {children}
    </section>
  );
}

function P({ children }) {
  return (
    <p className="text-[0.8125rem] leading-relaxed text-ink-muted">{children}</p>
  );
}

function List({ children }) {
  return (
    <ul className="ml-4 list-disc space-y-1.5 text-[0.8125rem] leading-relaxed text-ink-muted marker:text-ink-subtle">
      {children}
    </ul>
  );
}

export default function PrivacyContent() {
  return (
    <div className="space-y-5">
      <P>
        The United University Machine Learning Club (&ldquo;UU MLC&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;) runs Nexus, the club&rsquo;s
        membership and activity platform. This policy explains what personal
        information Nexus collects, why we collect it, who can see it, and the
        choices you have.
      </P>

      <p className="nx-eyebrow">Effective {EFFECTIVE_DATE}</p>

      <Section title="1. Who we are">
        <P>
          The United University Machine Learning Club is responsible for the
          personal information collected through Nexus. For any question about
          this policy or your data, contact us at <Todo>contact email</Todo>{" "}
          <Todo>legal / postal identity</Todo>.
        </P>
      </Section>

      <Section title="2. What we collect">
        <P>Information you give us when you join and use the club:</P>
        <List>
          <li>
            Your <strong className="text-ink">full name</strong>, an optional{" "}
            <strong className="text-ink">nickname</strong>, and your{" "}
            <strong className="text-ink">email address</strong>.
          </li>
          <li>
            A <strong className="text-ink">password</strong> you set at sign-up.
            It is stored and checked by our authentication provider in hashed
            form — we never see or store your actual password.
          </li>
          <li>
            An optional short <strong className="text-ink">bio</strong> and an
            optional <strong className="text-ink">profile picture</strong> you
            choose to upload.
          </li>
        </List>
        <P>Information created as you take part in the club:</P>
        <List>
          <li>
            Your <strong className="text-ink">club points</strong> and the
            history of point changes.
          </li>
          <li>
            <strong className="text-ink">Tasks</strong> you create or complete
            and <strong className="text-ink">news posts</strong> you publish (if
            you are an editor).
          </li>
          <li>
            For administrators, an{" "}
            <strong className="text-ink">activity log</strong> that records
            administrative actions — for example role changes and point
            adjustments — together with the account that performed them.
          </li>
        </List>
        <P>
          We ask only for what the club needs to run its membership,
          recognition and activity features. Please don&rsquo;t put sensitive
          personal information into free-text fields such as your bio.
        </P>
      </Section>

      <Section title="3. Why we use it, and our legal basis">
        <List>
          <li>To create and run your account and show the right view for your role.</li>
          <li>
            To operate club features: the member directory, points and
            leaderboards, tasks, and news.
          </li>
          <li>
            To let administrators approve members, manage roles, and keep the
            club running.
          </li>
          <li>To keep the platform secure and investigate misuse.</li>
        </List>
        <P>
          We process this information to provide a service you asked to join,
          and on the basis of the consent you give when you create an account
          and agree to this policy. You can withdraw consent at any time by
          asking us to delete your account (see &ldquo;Your rights&rdquo;).
        </P>
      </Section>

      <Section title="4. Who can see your information">
        <P>
          Nexus is an internal tool for club members, not a public website.
        </P>
        <List>
          <li>
            Other signed-in members can see your profile (name or nickname,
            picture and bio), your points and rank, and the news or activity you
            contribute to the club.
          </li>
          <li>
            Administrators can see and manage member accounts and the
            administrative activity log.
          </li>
          <li>
            We share data with the service providers that make Nexus work (see
            the next section). We do not sell or rent your personal information,
            and we do not share it for advertising.
          </li>
        </List>
      </Section>

      <Section title="5. Service providers">
        <List>
          <li>
            <strong className="text-ink">Supabase</strong> provides our
            authentication, database and file storage. Your account, profile,
            activity data and uploaded picture are stored on Supabase&rsquo;s
            infrastructure on our behalf.
          </li>
          <li>
            Our <strong className="text-ink">web hosting provider</strong>{" "}
            serves the Nexus application to your browser.
          </li>
        </List>
        <P>
          These providers process data on our instructions.{" "}
          <Todo>
            confirm the hosting provider, and where data is stored if members
            are outside its region
          </Todo>
        </P>
      </Section>

      <Section title="6. What we do not do">
        <List>
          <li>We do not sell or rent your personal data.</li>
          <li>
            We do not show third-party advertising or use advertising or
            cross-site tracking cookies.
          </li>
          <li>We do not use third-party analytics.</li>
          <li>
            We do not use artificial intelligence, machine learning, or
            automated decision-making to process your personal data. Despite the
            club&rsquo;s name, Nexus is an ordinary membership tool — it does not
            run AI on your information or make automated decisions about you.
          </li>
        </List>
      </Section>

      <Section title="7. How long we keep it, and deleting your data">
        <List>
          <li>
            You can edit or clear most of your profile information at any time
            from your profile page.
          </li>
          <li>
            To close your account, ask an administrator to remove your
            membership.
          </li>
          <li>
            To have your uploaded picture and personal information erased,
            contact us at <Todo>contact email</Todo> and we will remove them.
          </li>
          <li>
            Some contributions — such as published news or points history — may
            remain as part of the club&rsquo;s records after an account is
            closed; tell us if you need those removed and we will handle it.
          </li>
        </List>
      </Section>

      <Section title="8. Your rights">
        <P>
          Depending on where you live, you may have the right to access,
          correct, export, or delete your personal information, and to withdraw
          consent. You can do most of this directly in Nexus, or by contacting
          us at <Todo>contact email</Todo>. We will respond within a reasonable
          time.
        </P>
      </Section>

      <Section title="9. Eligibility">
        <P>
          Nexus is intended for university students and club members. It is not
          directed at children under 16, and you must be at least 16 (or the age
          of digital consent where you live) to create an account.
        </P>
      </Section>

      <Section title="10. Cookies and local storage">
        <P>
          Nexus does not use advertising or cross-site tracking cookies. It
          keeps a few things in your browser so the app works:
        </P>
        <List>
          <li>your authentication session, so you stay signed in;</li>
          <li>
            <code className="rounded bg-well px-1 py-0.5 text-[0.75rem]">
              uu-mlc-theme
            </code>{" "}
            — your light / dark / system appearance choice;
          </li>
          <li>
            <code className="rounded bg-well px-1 py-0.5 text-[0.75rem]">
              uu-mlc-active-tab
            </code>{" "}
            — the section you last had open, so Nexus reopens there.
          </li>
        </List>
        <P>
          Clearing your browser&rsquo;s site data removes these; clearing the
          session signs you out.
        </P>
      </Section>

      <Section title="11. Changes to this policy">
        <P>
          We may update this policy as Nexus changes. We will revise the
          effective date above, and announce significant changes in the app.
        </P>
      </Section>

      <Section title="12. Contact">
        <P>
          Questions or requests about your data: <Todo>contact email</Todo>,
          United University Machine Learning Club, <Todo>postal / entity</Todo>.
        </P>
      </Section>
    </div>
  );
}
