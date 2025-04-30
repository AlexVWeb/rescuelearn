<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Post;
use ApiPlatform\Metadata\Put;
use App\Repository\QuizRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: QuizRepository::class)]
#[ApiResource(
    operations: [
        new Get(normalizationContext: ['groups' => ['quiz:read', 'quiz:detail']]),
        new GetCollection(normalizationContext: ['groups' => ['quiz:read']]),
        new Post(),
        new Put(),
        new Delete(),
    ],
    normalizationContext: ['groups' => ['quiz:read']],
    denormalizationContext: ['groups' => ['quiz:write']],
)]
class Quiz
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['quiz:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['quiz:read', 'quiz:write'])]
    private ?string $title = null;

    #[ORM\Column]
    #[Groups(['quiz:read', 'quiz:write'])]
    private ?int $timePerQuestion = 30;

    #[ORM\Column]
    #[Groups(['quiz:read', 'quiz:write'])]
    private ?int $passingScore = 70;

    #[ORM\Column(type: 'boolean', options: ['default' => false])]
    #[Groups(['quiz:read', 'quiz:write'])]
    private bool $modeRandom = false;

    #[ORM\OneToMany(mappedBy: 'quiz', targetEntity: Question::class, orphanRemoval: true)]
    #[Groups(['quiz:detail'])]
    private Collection $questions;

    /**
     * @var Collection<int, CategoryQuestion>
     */
    #[ORM\ManyToMany(targetEntity: CategoryQuestion::class, mappedBy: 'quizzes')]
    #[Groups(['quiz:detail', 'quiz:write'])]
    private Collection $categoryQuestions;

    #[ORM\ManyToOne(targetEntity: LevelQuestion::class, inversedBy: 'quizzes')]
    #[ORM\JoinColumn(nullable: true)]
    #[Groups(['quiz:detail', 'quiz:write'])]
    private ?LevelQuestion $level = null;

    public function __construct()
    {
        $this->questions = new ArrayCollection();
        $this->categoryQuestions = new ArrayCollection();
        $this->modeRandom = false;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getTimePerQuestion(): ?int
    {
        return $this->timePerQuestion;
    }

    public function setTimePerQuestion(int $timePerQuestion): static
    {
        $this->timePerQuestion = $timePerQuestion;

        return $this;
    }

    public function getPassingScore(): ?int
    {
        return $this->passingScore;
    }

    public function setPassingScore(int $passingScore): static
    {
        $this->passingScore = $passingScore;

        return $this;
    }

    public function isModeRandom(): bool
    {
        return $this->modeRandom;
    }

    public function setModeRandom(bool $modeRandom): static
    {
        $this->modeRandom = $modeRandom;
        return $this;
    }

    /**
     * @return Collection<int, Question>
     */
    public function getQuestions(): Collection
    {
        return $this->questions;
    }

    public function addQuestion(Question $question): static
    {
        if (!$this->questions->contains($question)) {
            $this->questions->add($question);
            $question->setQuiz($this);
        }

        return $this;
    }

    public function removeQuestion(Question $question): static
    {
        if ($this->questions->removeElement($question)) {
            // set the owning side to null (unless already changed)
            if ($question->getQuiz() === $this) {
                $question->setQuiz(null);
            }
        }

        return $this;
    }

    public function __toString(): string
    {
        return $this->title ?? '';
    }

    /**
     * @return Collection<int, CategoryQuestion>
     */
    public function getCategoryQuestions(): Collection
    {
        return $this->categoryQuestions;
    }

    public function addCategoryQuestion(CategoryQuestion $categoryQuestion): static
    {
        if (!$this->categoryQuestions->contains($categoryQuestion)) {
            $this->categoryQuestions->add($categoryQuestion);
            $categoryQuestion->addQuiz($this);
        }

        return $this;
    }

    public function removeCategoryQuestion(CategoryQuestion $categoryQuestion): static
    {
        if ($this->categoryQuestions->removeElement($categoryQuestion)) {
            $categoryQuestion->removeQuiz($this);
        }

        return $this;
    }

    public function getLevel(): ?LevelQuestion
    {
        return $this->level;
    }

    public function setLevel(?LevelQuestion $level): static
    {
        $this->level = $level;
        return $this;
    }

    /**
     * @return int
     */
    #[Groups(['quiz:read'])]
    public function getQuestionCount(): int
    {
        return $this->questions->count();
    }
}