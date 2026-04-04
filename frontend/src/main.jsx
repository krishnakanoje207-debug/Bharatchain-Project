import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function BootstrapScreen() {
	return (
		<main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
			<section className="card" style={{ maxWidth: 760, width: '100%' }}>
				<h2>BharatChain Frontend</h2>
				<p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
					Frontend dev server is now running on localhost.
				</p>
				<p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
					Note: several app pages are empty in this workspace, so this is a safe bootstrap view.
				</p>
			</section>
		</main>
	);
}

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<BootstrapScreen />
	</React.StrictMode>
);
