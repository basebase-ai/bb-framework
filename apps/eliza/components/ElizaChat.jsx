/**
 * ELIZA Chat Interface
 * Classic 1960s terminal-style chat interface for ELIZA
 */

import React, { useState, useEffect, useRef } from 'react';
import { Stack, TextInput, Paper, Text, ScrollArea, Box, Container } from '@mantine/core';
import { ElizaEngine } from '../elizaEngine.js';

export function ElizaChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [eliza] = useState(() => new ElizaEngine());
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Initial greeting
  useEffect(() => {
    setMessages([
      { role: 'eliza', text: eliza.getGreeting() }
    ]);
  }, [eliza]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message
    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);

    // Get ELIZA response
    const response = eliza.getResponse(input);
    const elizaMessage = { role: 'eliza', text: response };

    // Add ELIZA response after a short delay (simulate thinking)
    setTimeout(() => {
      setMessages(prev => [...prev, elizaMessage]);
    }, 500);

    // Clear input
    setInput('');
  };

  return (
    <Container size="md" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* Messages */}
        <ScrollArea
          ref={scrollRef}
          style={{
            flex: 1,
            backgroundColor: '#000',
            borderRadius: '4px',
            padding: '1.5rem',
          }}
          styles={{
            viewport: {
              '& > div': {
                display: 'block !important',
              }
            }
          }}
        >
          <Stack gap="md">
            {messages.map((msg, idx) => (
              <Box key={idx}>
                {msg.role === 'user' ? (
                  <Text
                    style={{
                      color: '#00ff00',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {msg.text}
                  </Text>
                ) : (
                  <Text
                    style={{
                      color: '#00aaff',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      textTransform: 'uppercase',
                    }}
                  >
                    {msg.text}
                  </Text>
                )}
              </Box>
            ))}
          </Stack>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit}>
          <TextInput
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message and press Enter..."
            size="md"
            styles={{
              input: {
                fontFamily: 'monospace',
                fontSize: '14px',
                backgroundColor: '#111',
                color: '#00ff00',
                border: '1px solid #333',
                '&:focus': {
                  borderColor: '#00ff00',
                }
              }
            }}
            autoFocus
          />
        </form>

        {/* Instructions */}
        <Text size="xs" c="dimmed" ta="center" style={{ fontFamily: 'monospace' }}>
          ELIZA - A Computer Program For the Study of Natural Language Communication (1966)
        </Text>
      </Box>
    </Container>
  );
}
