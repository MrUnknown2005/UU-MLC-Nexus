const EFFECTIVE_DATE = "31 August 2026";
const CONTACT_EMAIL = "uumlc.nexus@gmail.com";

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
        The Uttara University Machine Learning Club (&ldquo;UU MLC&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates
        UUMLC Nexus, an internal membership and activity-management platform
        for UU MLC members and the Executive Committee.
      </P>

      <p className="nx-eyebrow">Effective {EFFECTIVE_DATE}</p>

      <Section title="1. Who we are">
        <P>
          UUMLC Nexus is a club project run and maintained by the UU MLC
          Executive Committee. For privacy, account, or data-related questions
          and requests, contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </P>
      </Section>

      <Section title="2. What we collect">
        <P>When you create and use a Nexus account, we may collect:</P>
        <List>
          <li>
            Your <strong className="text-ink">full name</strong>.
          </li>
          <li>
            An optional <strong className="text-ink">nickname</strong>.
          </li>
          <li>
            Your <strong className="text-ink">email address</strong>.
          </li>
          <li>
            A <strong className="text-ink">password</strong> used for account
            authentication. Password authentication is handled by Supabase
            Auth; UU MLC does not receive your password in plain text.
          </li>
        </List>

        <P>Information you may add or change on your profile includes:</P>
        <List>
          <li>
            A <strong className="text-ink">profile picture</strong>.
          </li>
          <li>
            An optional <strong className="text-ink">biography</strong>.
          </li>
          <li>
            Your <strong className="text-ink">full name</strong> and optional{" "}
            <strong className="text-ink">nickname</strong>.
          </li>
        </List>
      </Section>

      <Section title="3. How names are displayed">
        <P>
          Your full name is the default name displayed in Nexus. If you choose
          a nickname, Nexus may use that nickname as your displayed name
          instead, according to the profile settings of the platform.
        </P>
      </Section>

      <Section title="4. Information created through club activities">
        <P>
          Nexus may store information created through your participation in UU
          MLC, including:
        </P>
        <List>
          <li>Your club points and point history.</li>
          <li>Point awards or adjustments made through the club system.</li>
          <li>Tasks assigned to you and whether you completed them.</li>
          <li>Achievements awarded to you by the club.</li>
          <li>
            News or other club content you are authorized to create or publish.
          </li>
          <li>
            Administrative activity records associated with actions performed
            by authorized administrators or executives.
          </li>
        </List>
        <P>
          Members can complete tasks, while task creation and news publishing
          are restricted to administrators or other members who have the
          required permissions.
        </P>
      </Section>

      <Section title="5. Why we use your information">
        <List>
          <li>To create and maintain your Nexus account.</li>
          <li>To authenticate you and keep your account secure.</li>
          <li>To manage UU MLC membership and member roles.</li>
          <li>
            To provide club features such as the member directory, points,
            rankings, tasks, achievements, and news.
          </li>
          <li>To manage authorized administrative functions.</li>
          <li>To investigate misuse, abuse, or security issues.</li>
        </List>
        <P>
          We use member information for operating and managing the UU MLC
          club platform. We do not collect member information for advertising
          or commercial data-brokering purposes.
        </P>
      </Section>

      <Section title="6. Who can see your information">
        <P>
          Nexus is an internal club platform. Members can view other members
          through the directory.
        </P>
        <List>
          <li>
            A member&apos;s displayed name, profile picture, biography, club
            role, points, and ranking may be visible to signed-in members.
          </li>
          <li>
            If you choose a nickname for display, it may be shown instead of
            your full name.
          </li>
          <li>
            Your email address and password are not displayed in the member
            directory.
          </li>
          <li>
            Administrators and executives may have additional management
            permissions for club operations, but they do not receive extra
            directory visibility into member profiles merely because of their
            role.
          </li>
          <li>
            Authorized administrators may access administrative records and
            point-management information needed to perform their duties.
          </li>
        </List>
      </Section>

      <Section title="7. Service providers and where data is stored">
        <List>
          <li>
            <strong className="text-ink">Render</strong> hosts and serves the
            Nexus web application.
          </li>
          <li>
            <strong className="text-ink">Supabase</strong> provides services
            including authentication, database infrastructure, and file
            storage for Nexus.
          </li>
        </List>
        <P>
          Our Supabase project is hosted in <strong className="text-ink">
            Singapore
          </strong>
          . Your information may therefore be processed or stored using
          infrastructure located outside Bangladesh.
        </P>
      </Section>

      <Section title="8. What we do not do">
        <List>
          <li>We do not sell or rent your personal information.</li>
          <li>
            We do not use your information for third-party advertising.
          </li>
          <li>
            We do not use advertising or cross-site tracking cookies.
          </li>
          <li>
            We do not use third-party analytics for member profiling.
          </li>
          <li>
            Nexus does not use artificial intelligence or machine-learning
            systems to make decisions about members.
          </li>
        </List>
      </Section>

      <Section title="9. Cookies and browser storage">
        <P>
          Nexus does not use advertising or cross-site tracking cookies. The
          application may use browser storage or similar technical mechanisms
          required for normal operation, including:
        </P>
        <List>
          <li>your authentication session;</li>
          <li>
            your light, dark, or system theme preference;
          </li>
          <li>
            the application section you last had open, so Nexus can restore
            your previous location in the app.
          </li>
        </List>
        <P>
          Clearing your browser&apos;s site data may remove these items and
          may sign you out of Nexus.
        </P>
      </Section>

      <Section title="10. Data security">
        <P>
          We use reasonable technical and organizational measures to protect
          member information against unauthorized access, alteration, misuse,
          loss, or disclosure. Nexus uses role-based permissions to restrict
          administrative functions.
        </P>
        <P>
          No internet-based system can be guaranteed to be completely secure.
          If a security incident affects personal information, UU MLC will
          investigate and take reasonable steps to contain and address the
          incident and make any notifications required by applicable law.
        </P>
      </Section>

      <Section title="11. Account deletion and data removal">
        <P>
          Members may request that their Nexus account and associated personal
          information be deleted.
        </P>
        <List>
          <li>
            Requests can be made by email or through another reasonable contact
            channel with the UU MLC Executive Committee.
          </li>
          <li>
            The Executive Committee may first confirm that the member
            intentionally wants to leave the club and delete the account.
          </li>
          <li>
            Once confirmed, deletion is normally processed within{" "}
            <strong className="text-ink">1–7 days</strong>, depending on the
            member&apos;s off-boarding circumstances.
          </li>
          <li>
            After deletion is completed, the member&apos;s authentication
            account and associated profile information are removed from the
            active Nexus system.
          </li>
          <li>
            UU MLC does not intentionally retain a member&apos;s active Nexus
            profile after a completed deletion request, except where retention
            is required by applicable law.
          </li>
        </List>
      </Section>

      <Section title="12. Your rights">
        <P>
          Subject to applicable law, you may have the right to access, correct,
          update, or request deletion of your personal information. You may
          also have the right to ask how your information is being used and to
          raise a privacy-related concern.
        </P>
        <P>
          To make a privacy or account-data request, contact the UU MLC
          Executive Committee at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
          . We will review legitimate requests and respond within a reasonable
          period, subject to applicable law and necessary verification.
        </P>
      </Section>

      <Section title="13. Eligibility">
        <P>
          Nexus is intended for UU MLC university members and club participants.
          The platform is designed for an adult university-member audience.
        </P>
      </Section>

      <Section title="14. Changes to this policy">
        <P>
          We may update this Privacy Policy when Nexus, UU MLC&apos;s practices,
          or applicable legal requirements change. Significant changes may be
          announced through Nexus or other appropriate UU MLC communication
          channels. The effective date above will be updated when the policy
          changes.
        </P>
      </Section>

      <Section title="15. Contact">
        <P>
          For privacy questions, account-deletion requests, correction
          requests, or other data-related matters, contact:
        </P>
        <P>
          <strong className="text-ink">UU MLC Executive Committee</strong>
          <br />
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-semibold text-ink underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
        </P>
      </Section>
    </div>
  );
}
