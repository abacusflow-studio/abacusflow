'use client'; // 按钮有点击事件，需要是客户端组件

import { Button } from '@abacusflow/ui';

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1>Web App</h1>
      <p style={{ margin: '20px 0' }}>This button is a shared component from <strong>packages/ui</strong>:</p>
      <Button
        label="click me"
        onClick={() => alert('Shared button clicked!')}
      />
    </main>
  );
}
