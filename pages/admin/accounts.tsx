import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type AccountSettings = {
  email: string;
  canChangePassword: boolean;
  canManageAccounts: boolean;
  canRecoverAccounts: boolean;
  accounts: AdminAccount[];
};

type AdminAccount = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  disabled: boolean;
  manageable: boolean;
};

export default function AdminAccounts() {
  const router = useRouter();
  const [account, setAccount] = useState<AccountSettings | null>(null);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createStatus, setCreateStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [accountStatus, setAccountStatus] = useState('');
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const loadAccounts = async () => {
    const response = await fetch('/api/admin/accounts');
    if (response.status === 401) {
      await router.push('/admin/login');
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load account settings.');
    setAccount(result as AccountSettings);
    setAccounts(Array.isArray(result.accounts) ? result.accounts : []);
  };

  useEffect(() => {
    let active = true;
    loadAccounts()
      .catch((error) => {
        if (active) setPasswordStatus(error.message || 'Could not load account settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  const createAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setCreateStatus('');
    try {
      const response = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: createEmail, password: createPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create account.');
      setCreateEmail('');
      setCreatePassword('');
      await loadAccounts();
      setCreateStatus(`Admin account created for ${result.account.email}.`);
    } catch (error) {
      setCreateStatus(error instanceof Error ? error.message : 'Could not create account.');
    } finally {
      setCreating(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordStatus('');
    try {
      const response = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          currentPassword,
          newPassword,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not change password.');
      setCurrentPassword('');
      setNewPassword('');
      if (result.requiresLogin) {
        setPasswordStatus('Password changed. Please sign in again with your new password.');
        await router.push('/admin/login');
        return;
      }
      setPasswordStatus('Password changed successfully.');
    } catch (error) {
      setPasswordStatus(error instanceof Error ? error.message : 'Could not change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const updateAccountAccess = async (item: AdminAccount) => {
    const action = item.disabled ? 'restore' : 'delete';
    const message = item.disabled
      ? `Recover ${item.email}? They will be able to sign in again.`
      : `Delete ${item.email}? They will lose admin access until you recover the account.`;
    if (!window.confirm(message)) return;
    setPendingAccountId(item.id);
    setAccountStatus('');
    try {
      const response = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, accountId: item.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update the account.');
      await loadAccounts();
      setAccountStatus(`Account ${item.disabled ? 'recovered' : 'deleted'}: ${item.email}.`);
    } catch (error) {
      setAccountStatus(error instanceof Error ? error.message : 'Could not update the account.');
    } finally {
      setPendingAccountId(null);
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <p className="panel-label">Account settings</p>
          <h1>Admin accounts</h1>
        </div>
      </div>

      {account?.canManageAccounts && (
        <>
          <section className="admin-panel account-settings-panel">
            <h2>Create new account</h2>
            <p>Create an administrator account that can sign in to the admin dashboard.</p>
            <form className="account-settings-form" onSubmit={createAccount}>
              <label>
                Email address
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={createEmail}
                  onChange={(event) => setCreateEmail(event.target.value)}
                  placeholder="admin@example.com"
                />
              </label>
              <label>
                Temporary password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={createPassword}
                  onChange={(event) => setCreatePassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>
              <button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create account'}</button>
            </form>
            {createStatus && (
              <p className={`account-status${createStatus.startsWith('Admin account created') ? ' success' : ''}`} role="status">
                {createStatus}
              </p>
            )}
          </section>

          <section className="admin-panel account-list-panel">
            <div className="account-list-heading">
              <div>
                <h2>Admin accounts</h2>
                <p>Sub-admin accounts created here can be deleted and recovered at any time. Deleted accounts cannot sign in. Passwords are never displayed.</p>
              </div>
              <span>{accounts.length} accounts</span>
            </div>
            {loading ? <p>Loading accounts...</p> : accounts.length ? (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr><th>Email address</th><th>Created</th><th>Last sign in</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {accounts.map((item) => (
                      <tr key={item.id}>
                        <td>{item.email || 'No email address'}</td>
                        <td>{new Date(item.created_at).toLocaleDateString()}</td>
                        <td>{item.last_sign_in_at ? new Date(item.last_sign_in_at).toLocaleString() : 'Never'}</td>
                        <td>{item.disabled ? 'Deleted' : 'Active'}</td>
                        <td>
                          {item.manageable && account.canRecoverAccounts && (
                            <button type="button" className={item.disabled ? 'link-btn' : 'link-btn danger-button'} disabled={pendingAccountId !== null} onClick={() => updateAccountAccess(item)}>
                              {pendingAccountId === item.id ? 'Please wait...' : item.disabled ? 'Recover' : 'Delete'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No admin accounts found.</p>
            )}
            {!account.canRecoverAccounts && <p>Sign in as the head administrator with a verified Supabase Auth account to delete or recover sub-admin accounts.</p>}
            {accountStatus && <p className={`account-status${/^Account (deleted|recovered):/.test(accountStatus) ? ' success' : ''}`} role="status">{accountStatus}</p>}
          </section>
        </>
      )}

      <section className="admin-panel account-settings-panel">
        <h2>Change password</h2>
        {loading ? <p>Loading account settings...</p> : account ? (
          <>
            <div className="account-settings-email">
              <strong>Email address</strong>
              <span>{account.email}</span>
            </div>
            {account.canChangePassword ? (
              <form className="account-settings-form password-settings-form" onSubmit={changePassword}>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 8 characters"
                  />
                </label>
                <label>
                  Current password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={changingPassword}>
                  {changingPassword ? 'Saving...' : 'Save password'}
                </button>
              </form>
            ) : (
              <p>This account is configured through environment settings and cannot be changed here.</p>
            )}
            {passwordStatus && (
              <p className={`account-status${passwordStatus === 'Password changed successfully.' ? ' success' : ''}`} role="status">
                {passwordStatus}
              </p>
            )}
          </>
        ) : (
          passwordStatus && <p className="account-status" role="alert">{passwordStatus}</p>
        )}
      </section>
    </main>
  );
}
