# Content Guide

This guide explains how to add and modify content for the qult terminal landing page.

## Content Structure

All content files are located in the `content/` directory and are loaded dynamically when users enter commands.

## Adding New Content Pages

### Simple Content Commands

To add a new simple content page (like `about`, `help`, `services`):

1. Create an HTML file in `content/` directory (e.g., `content/my-page.html`)
2. Add the command mapping in `src/main.js`:
   ```javascript
   const SIMPLE_CONTENT_COMMANDS = {
     // ... existing commands
     'mypage': 'content/my-page.html',
   };
   ```
3. Add the command to autocomplete in `AUTOCOMPLETE_COMMANDS` array
4. The content will be accessible via the command: `mypage`

### HTML Structure

Your content HTML should follow this structure:

```html
<section class="content-block">
  <h2>Page Title</h2>
  
  <p>Your content here...</p>
  
  <ul class="command-list">
    <li>List item 1</li>
    <li>List item 2</li>
  </ul>
  
  <!-- Use <hr> tags to split content into pages -->
  <hr>
  
  <h3>Next Section</h3>
  <p>More content...</p>
</section>
```

### Pagination

To split content into multiple pages:

- Add `<hr>` tags between sections
- The terminal will automatically create pagination controls
- Users can navigate with left/right arrow keys or buttons
- Press Escape or type to exit pagination mode

Example:
```html
<section class="content-block">
  <h2>Page 1</h2>
  <p>First page content...</p>
  
  <hr>
  
  <h2>Page 2</h2>
  <p>Second page content...</p>
</section>
```

## Adding Service Pages

Service pages use the `svc <name>` command pattern:

1. Create a file: `content/service-<name>.html`
2. Add the service slug to `DEFAULT_SERVICE_SLUGS` in `src/main.js`:
   ```javascript
   const DEFAULT_SERVICE_SLUGS = [
     // ... existing services
     'myservice',
   ];
   ```
3. Access via: `svc myservice`

## Adding Case Studies

Case studies use the `case <name>` command pattern:

1. Create a file: `content/case-<name>.html`
2. Add the case slug to `DEFAULT_CASE_SLUGS` in `src/main.js`:
   ```javascript
   const DEFAULT_CASE_SLUGS = [
     // ... existing cases
     'mycase',
   ];
   ```
3. Access via: `case mycase`

## Images

### Adding Images

1. Place images in the `assets/` directory
2. Reference them in HTML: `<img src="assets/my-image.png" alt="Description" loading="lazy" width="150" />`
3. Always include:
   - `loading="lazy"` for performance
   - `alt` text for accessibility
   - `width` or `height` to prevent layout shift

### Image Best Practices

- Use appropriate formats (PNG for logos, JPG for photos)
- Optimize images before adding
- Use `loading="lazy"` for images below the fold
- The terminal will automatically scroll after images load

## Styling

### Available CSS Classes

- `.content-block` - Main content container
- `.command-list` - Styled list for commands/features
- `.highlights-row` - Row container for highlight cards
- `.highlight` - Individual highlight card
- `.muted` - Muted text color
- `.error` - Error text color
- `code` - Inline code styling

### Example Usage

```html
<section class="content-block">
  <h2>Title</h2>
  <p>Regular text with <code>inline code</code>.</p>
  <p class="muted">Muted secondary text.</p>
  
  <ul class="command-list">
    <li><code>command</code> — description</li>
  </ul>
</section>
```

## Error Handling

If a content file is missing or fails to load:
- Users will see: "Content is unavailable right now."
- For `svc`/`case` commands: "resource not found."

## Tips

- Keep content concise and scannable
- Use semantic HTML
- Test pagination if using `<hr>` tags
- Ensure images are optimized
- Follow the existing content structure for consistency

