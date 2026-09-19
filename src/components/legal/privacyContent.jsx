const EFFECTIVE_DATE = "9 September 2026";
const LAST_UPDATED = "19 September 2026";
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
    <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
      {children}
    </p>
  );
}

function List({ children }) {
  return (
    <ul className="ml-4 list-disc space-y-1.5 text-[0.8125rem] leading-relaxed text-ink-muted marker:text-ink-subtle">
      {children}
    </ul>
  );
}

function Mail() {
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="font-semibold text-ink underline underline-offset-2"
    >
      {CONTACT_EMAIL}
    </a>
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

      <p className="nx-eyebrow">
        Effective {EFFECTIVE_DATE} &middot; Last updated {LAST_UPDATED}
      </p>

      <Section title="1. Who we are">
        <P>
          UUMLC Nexus is a club project run and maintained by the UU MLC
          Executive Committee. For privacy, account, or data-related questions
          and requests, contact us at <Mail />.
        </P>
      </Section>

      <Section title="2. What we collect">
        <P>When you create and use a Nexus account, we collect:</P>
        <List>
          <li>
            Your <strong className="text-ink">full name</strong> and an
            optional <strong className="text-ink">nickname</strong>.
          </li>
          <li>
            Your <strong className="text-ink">email address</strong>.
          </li>
          <li>
            A <strong className="text-ink">password</strong> used for account
            authentication. Password authentication is handled by Supabase
            Auth; UU MLC does not receive or store your password in plain
            text.
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
            Your messaging preference (who may start a new direct message with
            you: everyone, group-mates only, or no one).
          </li>
        </List>
        <P>
          Please do not put sensitive personal information (such as phone
          numbers, home addresses, or ID numbers) in your biography or
          messages. Your biography is visible to other members.
        </P>
      </Section>

      <Section title="3. How names are displayed">
        <P>
          Your full name is the default name displayed in Nexus. If you choose
          a nickname, Nexus may show that nickname instead, according to the
          profile settings of the platform.
        </P>
      </Section>

      <Section title="4. Information created through club activities">
        <P>
          Nexus stores information created through your participation in UU
          MLC, including:
        </P>
        <List>
          <li>Your club points, point history, and leaderboard ranking.</li>
          <li>
            Point awards or adjustments made through the club system, and the
            reason recorded for each.
          </li>
          <li>
            Tasks assigned to you, whether you completed them, and task
            activity.
          </li>
          <li>Achievements awarded to you.</li>
          <li>Groups you belong to.</li>
          <li>
            Notifications generated for you (for example, about points, news,
            tasks, or new members).
          </li>
          <li>
            News, tasks, and image attachments you are authorized to create or
            publish.
          </li>
          <li>
            Administrative activity records (an audit log) of actions
            performed by administrators, including actions such as changing
            your role or account status.
          </li>
        </List>
        <P>
          Members can complete tasks. Task creation, news publishing, and
          attachment uploads are restricted to members who have the required
          permissions.
        </P>
      </Section>

      <Section title="5. Messages">
        <P>
          Nexus includes private direct and group messaging between members.
          We store the messages you send, who took part in each conversation,
          when you last read it, your block list, and any safety reports made
          about a conversation.
        </P>
        <List>
          <li>
            <strong className="text-ink">Who can read your messages.</strong>{" "}
            Only the participants in a conversation can read it through Nexus.
            Administrators and executives have no standing access to private
            conversations.
          </li>
          <li>
            <strong className="text-ink">Not end-to-end encrypted.</strong>{" "}
            Messages are protected by access controls, not by end-to-end
            encryption. Anyone with direct administrative access to the
            underlying database could technically read stored messages. Do not
            share passwords or highly sensitive information through Nexus
            messages.
          </li>
          <li>
            <strong className="text-ink">
              Safety review (&ldquo;break-glass&rdquo;).
            </strong>{" "}
            To deal with harassment, threats, or other serious safety
            concerns, a conversation may be opened for review only if a
            participant reports it or the head administrators raise a safety
            concern, and only if <em>every</em> head administrator approves.
            Access is limited to that one conversation, expires automatically
            after 72 hours, and is recorded in the audit log. If access is
            granted, the participants in that conversation are notified.
          </li>
          <li>
            <strong className="text-ink">Deleting messages.</strong> When you
            delete a message it is hidden from conversations, but it may remain
            in our database. Messages you sent remain in the conversation
            after you delete your account, shown without your name (see
            Section 13).
          </li>
          <li>
            You can block other members and control who may start a new direct
            message with you from your profile settings.
          </li>
        </List>
      </Section>

      <Section title="6. Why we use your information">
        <List>
          <li>To create and maintain your Nexus account.</li>
          <li>To authenticate you and keep your account secure.</li>
          <li>To manage UU MLC membership and member roles.</li>
          <li>
            To provide club features such as the member directory, points,
            rankings, tasks, news, groups, notifications, and messaging.
          </li>
          <li>To manage authorized administrative functions.</li>
          <li>To maintain records of relevant administrative activity.</li>
          <li>
            To investigate misuse, abuse, harassment, or security issues.
          </li>
        </List>
        <P>
          We use member information only to operate and manage the UU MLC
          club platform. We do not collect member information for advertising
          or commercial data-brokering purposes.
        </P>
      </Section>

      <Section title="7. Roles and who can see your information">
        <P>
          Nexus is an internal club platform. What each person can see or do
          depends on the role assigned to their account. Nexus uses five
          standard roles:
        </P>
        <List>
          <li>
            <strong className="text-ink">Guest</strong> &mdash; a pending
            account with limited access. Guests are not shown in the member
            directory and cannot use member features until approved.
          </li>
          <li>
            <strong className="text-ink">Member</strong> &mdash; a standard
            active club member who can use the directory, tasks, points, and
            messaging.
          </li>
          <li>
            <strong className="text-ink">Executive</strong> &mdash; a club
            executive with operational permissions, such as awarding points
            and working with tasks.
          </li>
          <li>
            <strong className="text-ink">Administrator</strong> &mdash; a club
            administrator with broader responsibilities: managing members,
            groups, tasks, news, points, the administrative activity log, and
            analytics.
          </li>
          <li>
            <strong className="text-ink">Head Administrator</strong> &mdash;
            the highest-level administrator, who can also create and manage
            roles and permissions.
          </li>
        </List>
        <P>
          These describe the standard setup. Head Administrators can create
          custom roles and change permissions, so what a given account can do
          may differ from the descriptions above.
        </P>

        <P>
          <strong className="text-ink">What other members can see:</strong>
        </P>
        <List>
          <li>
            A member&apos;s displayed name, profile picture, biography, club
            role, points total, and ranking are visible to other approved
            members through the directory and leaderboard.
          </li>
          <li>
            If you choose a nickname for display, it may be shown instead of
            your full name.
          </li>
          <li>
            Your detailed point history (each award or adjustment and its
            reason) is visible to you and to administrators, not to other
            members.
          </li>
          <li>
            Your membership in a group is visible to other members of that
            group and to administrators, not to the whole club.
          </li>
          <li>
            News and club tasks are visible to all approved members.
          </li>
          <li>
            Your password is never visible to anyone. Your email address is
            not shown in the member directory or to other members.
          </li>
          <li>
            Pending and deactivated accounts are not shown in the member
            directory.
          </li>
        </List>

        <P>
          <strong className="text-ink">What administrators can see:</strong>
        </P>
        <List>
          <li>
            Administrators and Head Administrators can see all member
            profiles, including pending and deactivated accounts, so they can
            approve members and manage roles.
          </li>
          <li>
            They can also see every member&apos;s point history, the
            administrative activity log, and group memberships across the
            club.
          </li>
          <li>
            Administrators and executives do not have standing access to
            private messages. The only exception is the safety-review process
            described in Section 5.
          </li>
        </List>
        <P>
          Access is enforced by the database as well as by the app&apos;s
          interface, so hiding a button in the interface is not the only thing
          protecting your information.
        </P>
      </Section>

      <Section title="8. Service providers and where data is stored">
        <List>
          <li>
            <strong className="text-ink">Render</strong> hosts and serves the
            Nexus web application.
          </li>
          <li>
            <strong className="text-ink">Supabase</strong> provides
            authentication, database infrastructure, and file storage for
            Nexus. This includes the emails Supabase sends on our behalf, such
            as account confirmation and password-reset messages.
          </li>
        </List>
        <P>
          Our Supabase project is hosted in{" "}
          <strong className="text-ink">Singapore</strong>. Your information is
          therefore processed and stored using infrastructure located outside
          Bangladesh. Our hosting providers may also keep technical logs (such
          as IP addresses and request metadata) as part of operating their
          services.
        </P>
      </Section>

      <Section title="9. What we do not do">
        <List>
          <li>We do not sell or rent your personal information.</li>
          <li>We do not use your information for third-party advertising.</li>
          <li>We do not use advertising or cross-site tracking cookies.</li>
          <li>
            We do not use third-party analytics or load third-party fonts,
            scripts, or trackers in the app.
          </li>
          <li>
            Nexus does not use artificial intelligence or machine-learning
            systems to make decisions about members, and we do not use member
            data or messages to train or evaluate machine-learning models.
          </li>
        </List>
      </Section>

      <Section title="10. Cookies and browser storage">
        <P>
          Nexus does not use advertising or cross-site tracking cookies. The
          application uses browser storage required for normal operation,
          including:
        </P>
        <List>
          <li>your authentication session;</li>
          <li>your light, dark, or system theme preference;</li>
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

      <Section title="11. Data security">
        <P>
          We use reasonable technical and organizational measures to protect
          member information against unauthorized access, alteration, misuse,
          loss, or disclosure. Nexus uses role-based permissions and
          database-level access rules to restrict administrative functions.
          Interface controls are not the only basis for authorization.
        </P>
        <P>
          Uploaded files such as profile pictures and attachments are kept in
          private storage and are shown to signed-in members through
          short-lived, signed links rather than public URLs. Connections to
          Nexus are protected with HTTPS.
        </P>
        <P>
          No internet-based system can be guaranteed to be completely secure.
          If a security incident affects personal information, UU MLC will
          investigate, take reasonable steps to contain it, and notify
          affected members promptly, including any notifications required by
          applicable law.
        </P>
      </Section>

      <Section title="12. Inactive accounts">
        <P>
          If a member leaves the club or stops taking part, their account may
          be deactivated by an administrator. Deactivated accounts cannot use
          Nexus and are hidden from the directory, but their data is kept
          until the account is deleted. We may delete accounts that have been
          inactive for an extended period; where practical, we will contact
          you first.
        </P>
      </Section>

      <Section title="13. Account deletion and data removal">
        <P>
          You can delete your own Nexus account at any time from your profile.
          For your security, deletion asks you to re-enter your password and to
          confirm the action; once confirmed it takes effect immediately and
          cannot be undone.
        </P>
        <P>
          <strong className="text-ink">What is removed:</strong>
        </P>
        <List>
          <li>
            Your authentication account (including your email address), your
            profile (name, nickname, biography, role, and points), and your
            uploaded profile picture.
          </li>
          <li>
            Your point history, achievements, notifications, group
            memberships, block list, and messaging participation.
          </li>
        </List>
        <P>
          <strong className="text-ink">
            What may remain, without your name attached:
          </strong>
        </P>
        <List>
          <li>
            Club content you created, such as news posts, tasks, and groups,
            which stays for the club but is no longer linked to you.
          </li>
          <li>
            Messages you sent remain visible to the other participants in that
            conversation, shown as coming from a deleted member.
          </li>
          <li>
            Administrative audit-log entries and any safety reports, which are
            kept for accountability and are no longer linked to your account.
            Free-text descriptions in these records (for example, the title of
            a task or group) may still contain names or wording you or others
            entered.
          </li>
          <li>
            Past monthly leaderboard results may keep the name that was shown
            at the time.
          </li>
        </List>
        <P>
          You can also ask the UU MLC Executive Committee to delete your
          account, by email or another reasonable contact channel. The
          Committee may first confirm that you intend to leave the club. We
          aim to process such requests within{" "}
          <strong className="text-ink">7 days</strong>.
        </P>
        <P>
          Our database provider may keep routine backups for a limited time,
          so deleted data can persist in backups until they are overwritten.
          Except for the items listed above and any retention required by
          law, UU MLC does not intentionally retain your active Nexus profile
          after a completed deletion.
        </P>
      </Section>

      <Section title="14. Your rights">
        <P>Subject to applicable law, you can:</P>
        <List>
          <li>
            view and update your name, nickname, biography, and profile
            picture yourself from your profile;
          </li>
          <li>delete your account yourself, as described above;</li>
          <li>
            ask us for a copy of the personal information we hold about you;
          </li>
          <li>ask us to correct information you cannot change yourself;</li>
          <li>
            ask how your information is being used and raise a privacy
            concern.
          </li>
        </List>
        <P>
          To make a privacy or account-data request, contact the UU MLC
          Executive Committee at <Mail />. We will review legitimate requests
          and respond within a reasonable period, subject to applicable law
          and necessary verification of your identity.
        </P>
      </Section>

      <Section title="15. Eligibility">
        <P>
          Nexus is intended for UU MLC university members and club
          participants. Nexus is not directed at children. If we learn that an
          account belongs to someone under 18, we may restrict it or ask for
          the consent of a parent or guardian.
        </P>
      </Section>

      <Section title="16. Changes to this policy">
        <P>
          We may update this Privacy Policy when Nexus, UU MLC&apos;s practices,
          or applicable legal requirements change. Significant changes will be
          announced through Nexus or another appropriate UU MLC communication
          channel. The &ldquo;last updated&rdquo; date above shows when the
          policy last changed.
        </P>
      </Section>

      <Section title="17. Contact">
        <P>
          For privacy questions, account-deletion requests, correction
          requests, or other data-related matters, contact:
        </P>
        <P>
          <strong className="text-ink">UU MLC Executive Committee</strong>
          <br />
          <Mail />
        </P>
      </Section>
    </div>
  );
}