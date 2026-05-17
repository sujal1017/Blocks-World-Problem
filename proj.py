import pygame
import sys
import time

pygame.init()

# Window setup
WIDTH, HEIGHT = 1200, 700
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Blocks World Problem - AI Animation")

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
BLUE = (70, 130, 255)
GREEN = (0, 200, 120)
RED = (220, 70, 70)
GRAY = (40, 40, 40)
YELLOW = (255, 215, 0)
BACKGROUND = (15, 15, 35)

# Fonts
title_font = pygame.font.SysFont("Arial", 40, bold=True)
text_font = pygame.font.SysFont("Arial", 24)
block_font = pygame.font.SysFont("Arial", 28, bold=True)

clock = pygame.time.Clock()

# Block dimensions
BLOCK_WIDTH = 100
BLOCK_HEIGHT = 45

# Animation states
steps = [
    {
        "title": "Initial State",
        "left": ["B", "C", "D", "E", "F", "G", "H", "A"],
        "right": []
    },
    {
        "title": "Move A to Table",
        "left": ["B", "C", "D", "E", "F", "G", "H"],
        "right": ["A"]
    },
    {
        "title": "Move H to Table",
        "left": ["B", "C", "D", "E", "F", "G"],
        "right": ["A", "H"]
    },
    {
        "title": "Move G to Table",
        "left": ["B", "C", "D", "E", "F"],
        "right": ["A", "H", "G"]
    },
    {
        "title": "Move F to Table",
        "left": ["B", "C", "D", "E"],
        "right": ["A", "H", "G", "F"]
    },
    {
        "title": "Move E to Table",
        "left": ["B", "C", "D"],
        "right": ["A", "H", "G", "F", "E"]
    },
    {
        "title": "Move D to Table",
        "left": ["B", "C"],
        "right": ["A", "H", "G", "F", "E", "D"]
    },
    {
        "title": "Move C to Table",
        "left": ["B"],
        "right": ["A", "H", "G", "F", "E", "D", "C"]
    },
    {
        "title": "Goal State Achieved",
        "left": [],
        "right": ["A", "B", "C", "D", "E", "F", "G", "H"]
    }
]

current_step = 0
playing = False
last_update = time.time()


class Button:
    def __init__(self, x, y, width, height, text, color):
        self.rect = pygame.Rect(x, y, width, height)
        self.text = text
        self.color = color

    def draw(self):
        pygame.draw.rect(screen, self.color, self.rect, border_radius=10)
        pygame.draw.rect(screen, WHITE, self.rect, 2, border_radius=10)

        label = text_font.render(self.text, True, WHITE)
        screen.blit(
            label,
            (
                self.rect.x + self.rect.width // 2 - label.get_width() // 2,
                self.rect.y + self.rect.height // 2 - label.get_height() // 2,
            ),
        )

    def clicked(self, pos):
        return self.rect.collidepoint(pos)


# Buttons
prev_button = Button(220, 620, 140, 50, "Previous", RED)
play_button = Button(390, 620, 140, 50, "Play", GREEN)
next_button = Button(560, 620, 140, 50, "Next", BLUE)
reset_button = Button(730, 620, 140, 50, "Reset", YELLOW)


# Draw blocks
def draw_stack(stack, x_position, title):
    title_text = text_font.render(title, True, WHITE)
    screen.blit(title_text, (x_position - 10, 120))

    base_y = 520

    for index, block in enumerate(stack):
        y = base_y - (index * (BLOCK_HEIGHT + 5))

        pygame.draw.rect(
            screen,
            BLUE,
            (x_position, y, BLOCK_WIDTH, BLOCK_HEIGHT),
            border_radius=8,
        )

        pygame.draw.rect(
            screen,
            WHITE,
            (x_position, y, BLOCK_WIDTH, BLOCK_HEIGHT),
            2,
            border_radius=8,
        )

        block_text = block_font.render(block, True, WHITE)

        screen.blit(
            block_text,
            (
                x_position + BLOCK_WIDTH // 2 - block_text.get_width() // 2,
                y + BLOCK_HEIGHT // 2 - block_text.get_height() // 2,
            ),
        )


# Main loop
while True:
    screen.fill(BACKGROUND)

    # Title
    title = title_font.render("Blocks World Problem", True, WHITE)
    screen.blit(title, (WIDTH // 2 - title.get_width() // 2, 30))

    subtitle = text_font.render(
        "Artificial Intelligence Planning Animation", True, (200, 200, 200)
    )
    screen.blit(subtitle, (WIDTH // 2 - subtitle.get_width() // 2, 80))

    step_data = steps[current_step]

    # Draw stacks
    draw_stack(step_data["left"], 300, "Initial Stack")
    draw_stack(step_data["right"], 750, "Goal Stack")

    # Current step title
    current_text = title_font.render(step_data["title"], True, YELLOW)
    screen.blit(current_text, (WIDTH // 2 - current_text.get_width() // 2, 560))

    # Draw buttons
    prev_button.draw()
    play_button.draw()
    next_button.draw()
    reset_button.draw()

    # Applications section
    info_title = text_font.render("Applications:", True, WHITE)
    screen.blit(info_title, (30, 180))

    applications = [
        "• Robotics",
        "• Warehouse Automation",
        "• AI Planning",
        "• Task Scheduling",
        "• Game AI",
        "• Problem Solving"
    ]

    for i, app in enumerate(applications):
        app_text = text_font.render(app, True, (220, 220, 220))
        screen.blit(app_text, (30, 220 + i * 35))

    # Auto animation
    if playing:
        current_time = time.time()

        if current_time - last_update > 2:
            last_update = current_time

            if current_step < len(steps) - 1:
                current_step += 1
            else:
                playing = False

    # Events
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

        if event.type == pygame.MOUSEBUTTONDOWN:
            mouse_pos = pygame.mouse.get_pos()

            if prev_button.clicked(mouse_pos):
                current_step = max(0, current_step - 1)

            elif next_button.clicked(mouse_pos):
                current_step = min(len(steps) - 1, current_step + 1)

            elif play_button.clicked(mouse_pos):
                playing = not playing

            elif reset_button.clicked(mouse_pos):
                current_step = 0
                playing = False

    pygame.display.update()
    clock.tick(60)
