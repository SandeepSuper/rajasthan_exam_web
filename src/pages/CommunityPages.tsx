import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { CommunityPost } from '../lib/types';
import { timeAgo, useLoad } from '../lib/utils';
import { Avatar, BackLink, Empty, Icon, Loadable, Modal, PageHeader, usePageTitle } from '../components/ui';

const FILTERS = ['All', 'History', 'Geography', 'Art & Culture', 'Polity', 'Economics', 'Other'];
const SUBJECTS = FILTERS.slice(1);

function PostCard({ post, onLike, full }: { post: CommunityPost; onLike: () => void; full?: boolean }) {
  const body = (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <Avatar pic={post.userProfilePicture} name={post.userName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bold">{post.userName}</div>
          <div className="tiny muted">{timeAgo(post.createdAt)}</div>
        </div>
        <span className="badge badge-primary">{post.subject}</span>
      </div>
      <p style={{ whiteSpace: 'pre-wrap', margin: 0, ...(full ? {} : { display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }) }}>
        {post.content}
      </p>
      {post.verifiedAnswer && (
        <div className="verified"><strong>✓ Verified answer: </strong>{post.verifiedAnswer}</div>
      )}
    </>
  );
  return (
    <div className="card post-card">
      {full ? body : <Link to={`/community/${post.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{body}</Link>}
      <div className="row mt small muted" style={{ gap: 18, marginTop: 12 }}>
        <button className="link-btn row" style={{ gap: 4, color: post.isLiked ? 'var(--danger)' : 'var(--text-2)', fontWeight: 500 }} onClick={onLike}>
          <Icon.heart filled={post.isLiked} /> {post.upvotes}
        </button>
        <Link to={`/community/${post.id}`} className="row" style={{ gap: 4, color: 'var(--text-2)' }}>💬 {post.commentCount}</Link>
        <span className="row" style={{ gap: 4 }}><Icon.eye /> {post.viewCount}</span>
      </div>
    </div>
  );
}

function useLike(userId: string | undefined, setPosts: (fn: (p: CommunityPost[]) => CommunityPost[]) => void) {
  return async (post: CommunityPost) => {
    if (!userId) return;
    // Optimistic update, then reconcile with the server's answer.
    const flip = (liked: boolean) => (p: CommunityPost) => p.id === post.id
      ? { ...p, isLiked: liked, upvotes: Math.max(0, p.upvotes + (liked === p.isLiked ? 0 : liked ? 1 : -1)) }
      : p;
    setPosts(list => list.map(flip(!post.isLiked)));
    try {
      const liked = await api.toggleLike(post.id, userId);
      setPosts(list => list.map(flip(liked)));
    } catch {
      setPosts(list => list.map(flip(post.isLiked)));
    }
  };
}

export function CommunityPage() {
  usePageTitle('Community');
  const { user } = useAuth();
  const posts = useLoad(() => api.posts(user?.id), [user?.id]);
  const [filter, setFilter] = useState('All');
  const [composing, setComposing] = useState(false);
  const like = useLike(user?.id, fn => posts.setData(d => (d ? fn(d) : d)));

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <PageHeader
        icon={<Icon.community />}
        title="Community"
        subtitle="Apne doubts poochhein aur doosre students ki madad karein."
        actions={<button className="btn btn-accent" onClick={() => setComposing(true)}>+ Doubt poochhein</button>}
      />
      <div className="tabs mt mb">
        {FILTERS.map(f => (
          <button key={f} className={'tab' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <Loadable state={posts}>
        {list => {
          const shown = list.filter(p => filter === 'All' || p.subject === filter);
          return shown.length === 0
            ? <Empty icon="💭" title="Abhi koi post nahi hai">Pehla doubt aap poochhiye!</Empty>
            : <div className="stack">{shown.map(p => <PostCard key={p.id} post={p} onLike={() => like(p)} />)}</div>;
        }}
      </Loadable>
      {composing && <ComposePost onClose={() => setComposing(false)} onPosted={() => { setComposing(false); posts.reload(); }} />}
    </div>
  );
}

function ComposePost({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [content, setContent] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function post() {
    if (!user || !content.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await api.createPost({
        userId: user.id, userName: user.name || 'Student', userProfilePicture: user.profilePicture,
        content: content.trim(), subject, category: 'General', examId: null,
      });
      onPosted();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>Naya doubt</h2>
      {err && <div className="alert alert-error">{err}</div>}
      <div className="field">
        <label>Subject</label>
        <select value={subject} onChange={e => setSubject(e.target.value)}>
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Aapka sawaal</label>
        <textarea autoFocus value={content} onChange={e => setContent(e.target.value)} maxLength={2000} placeholder="Apna doubt detail mein likhein…" />
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={post} disabled={busy || !content.trim()}>{busy ? 'Post ho raha hai…' : 'Post karein'}</button>
      </div>
    </Modal>
  );
}

export function PostDetailPage() {
  const { postId = '' } = useParams();
  const { user } = useAuth();
  const posts = useLoad(() => api.posts(user?.id), [user?.id]);
  const comments = useLoad(() => api.comments(postId), [postId]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const like = useLike(user?.id, fn => posts.setData(d => (d ? fn(d) : d)));
  usePageTitle('Doubt');

  useEffect(() => { api.viewPost(postId).catch(() => {}); }, [postId]);

  const post = posts.data?.find(p => p.id === postId);

  async function send() {
    if (!user || !text.trim()) return;
    setBusy(true);
    setErr('');
    try {
      const c = await api.addComment(postId, { userId: user.id, userName: user.name || 'Student', userProfilePicture: user.profilePicture, content: text.trim() });
      comments.setData(list => [...(list || []), c]);
      posts.setData(list => list?.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p) ?? list);
      setText('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="narrow" style={{ margin: '0 auto' }}>
      <BackLink to="/community" label="Community" />
      <Loadable state={posts}>
        {() => post ? <PostCard post={post} full onLike={() => like(post)} /> : <Empty title="Yeh post nahi mili" />}
      </Loadable>
      {post && (
        <>
          <h3 className="mt-lg">Jawab ({comments.data?.length ?? post.commentCount})</h3>
          <div className="card">
            <Loadable state={comments}>
              {list => list.length === 0 ? <p className="muted center" style={{ margin: 0 }}>Abhi koi jawab nahi. Pehla jawab aap dein!</p> : (
                <>
                  {list.map(c => (
                    <div key={c.id} className="list-item" style={{ alignItems: 'flex-start' }}>
                      <Avatar pic={c.userProfilePicture} name={c.userName} />
                      <div style={{ flex: 1 }}>
                        <div><span className="bold">{c.userName}</span> <span className="tiny muted">{timeAgo(c.createdAt)}</span></div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </Loadable>
            {err && <div className="alert alert-error mt">{err}</div>}
            <div className="row mt">
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Jawab likhein…" maxLength={1000}
                onKeyDown={e => { if (e.key === 'Enter') send(); }} />
              <button className="btn btn-grad" onClick={send} disabled={busy || !text.trim()}>Bhejein</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
