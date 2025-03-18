<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\QuestionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: QuestionRepository::class)]
#[ApiResource(
    operations: [
        new Get(),
        new GetCollection(),
        new Post(),
        new Put(),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['question:read']],
    denormalizationContext: ['groups' => ['question:write']],
)]
class Question
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['question:read', 'quiz:detail'])]
    private ?int $id = null;

    #[ORM\Column(type: 'text')]
    #[Groups(['question:read', 'question:write', 'quiz:detail'])]
    private ?string $text = null;

    #[ORM\Column(length: 1)]
    #[Groups(['question:read', 'question:write', 'quiz:detail'])]
    private ?string $correctAnswer = null;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['question:read', 'question:write', 'quiz:detail'])]
    private ?string $explanation = null;

    #[ORM\ManyToOne(inversedBy: 'questions')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['question:read'])]
    private ?Quiz $quiz = null;

    #[ORM\OneToMany(mappedBy: 'question', targetEntity: QuestionOption::class, orphanRemoval: true)]
    #[Groups(['question:read', 'question:write', 'quiz:detail'])]
    private Collection $options;

    public function __construct()
    {
        $this->options = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getText(): ?string
    {
        return $this->text;
    }

    public function setText(string $text): static
    {
        $this->text = $text;
        return $this;
    }

    public function getCorrectAnswer(): ?string
    {
        return $this->correctAnswer;
    }

    public function setCorrectAnswer(string $correctAnswer): static
    {
        $this->correctAnswer = $correctAnswer;
        return $this;
    }

    public function getExplanation(): ?string
    {
        return $this->explanation;
    }

    public function setExplanation(?string $explanation): static
    {
        $this->explanation = $explanation;
        return $this;
    }

    public function getQuiz(): ?Quiz
    {
        return $this->quiz;
    }

    public function setQuiz(?Quiz $quiz): static
    {
        $this->quiz = $quiz;
        return $this;
    }

    /**
     * @return Collection<int, QuestionOption>
     */
    public function getOptions(): Collection
    {
        return $this->options;
    }

    public function addOption(QuestionOption $option): static
    {
        if (!$this->options->contains($option)) {
            $this->options->add($option);
            $option->setQuestion($this);
        }

        return $this;
    }

    public function removeOption(QuestionOption $option): static
    {
        if ($this->options->removeElement($option)) {
            // set the owning side to null (unless already changed)
            if ($option->getQuestion() === $this) {
                $option->setQuestion(null);
            }
        }

        return $this;
    }

    public function __toString(): string
    {
        return $this->text ?? '';
    }
} 