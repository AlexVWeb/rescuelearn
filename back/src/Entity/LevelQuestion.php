<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use App\Repository\LevelQuestionRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: LevelQuestionRepository::class)]
#[ApiResource]
class LevelQuestion
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['quiz:detail', 'question:read'])]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Groups(['quiz:detail', 'question:read'])]
    private ?string $name = null;
    
    /**
     * @var Collection<int, Quiz>
     */
    #[ORM\OneToMany(mappedBy: 'level', targetEntity: Quiz::class)]
    private Collection $quizzes;
    
    public function __construct()
    {
        $this->quizzes = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;
        return $this;
    }
    
    /**
     * @return Collection<int, Quiz>
     */
    public function getQuizzes(): Collection
    {
        return $this->quizzes;
    }

    public function addQuiz(Quiz $quiz): static
    {
        if (!$this->quizzes->contains($quiz)) {
            $this->quizzes->add($quiz);
            $quiz->setLevel($this);
        }

        return $this;
    }

    public function removeQuiz(Quiz $quiz): static
    {
        if ($this->quizzes->removeElement($quiz)) {
            // set the owning side to null (unless already changed)
            if ($quiz->getLevel() === $this) {
                $quiz->setLevel(null);
            }
        }

        return $this;
    }

    public function __toString(): string
    {
        return $this->name ?? '';
    }
}
